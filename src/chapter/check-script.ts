import type { FieldError } from '../common/interfaces/api-response.interface.js';
import type { Character } from '../story/entities/story.entity.js';
import type { ScriptDto, ScriptLineDto } from './dto/script.dto.js';
import type { ScriptLine } from './entities/script.entity.js';

// The kinds of line; each line in a script has exactly one of these
const LINE_KINDS = [
  'dialogue',
  'prose',
  'choice',
  'background',
  'goto_line',
  'end',
] as const;

/** The kinds a line actually sets (null counts as not set). */
function kindsOf(line: ScriptLineDto) {
  return LINE_KINDS.filter((kind) => line[kind] != null);
}

/**
 * Checks the rules a single field's validator can't: that each line has
 * exactly one kind, line ids match positions, every jump and flag lands on
 * a real line, and dialogue only uses the story's characters and emotions.
 * Runs after the ScriptDto shape has been validated.
 *
 * Field paths match the ValidationPipe's, e.g. "lines.7.choice.1.goto_line".
 *
 * @param script the validated request body
 * @param characters the story's characters
 * @returns one FieldError per problem; empty when the script is fine
 */
export function checkScript(
  script: ScriptDto,
  characters: Character[],
): FieldError[] {
  const errors: FieldError[] = [];
  const fail = (field: string, message: string) =>
    errors.push({ field, message, success: false });

  const lineCount = script.lines.length;
  const isLine = (target: number) => target < lineCount;
  const emotionsOf = new Map(
    characters.map((c) => [c.name, c.emotions.map((e) => e.emotion)]),
  );

  script.lines.forEach((line, i) => {
    const at = `lines.${i}`;

    if (line.line_id !== i) {
      fail(`${at}.line_id`, `line_id must be ${i}, its position in lines`);
    }

    if (kindsOf(line).length !== 1) {
      fail(at, `each line must have exactly one of ${LINE_KINDS.join(', ')}`);
    }

    if (line.goto_line != null) {
      if (!isLine(line.goto_line)) {
        fail(`${at}.goto_line`, 'goto_line must point to a line in lines');
      } else if (line.goto_line === i) {
        // The reader would jump to the same line forever
        fail(`${at}.goto_line`, 'goto_line cannot point to its own line');
      }
    }

    line.choice?.forEach((option, j) => {
      if (!isLine(option.goto_line)) {
        fail(
          `${at}.choice.${j}.goto_line`,
          'goto_line must point to a line in lines',
        );
      }
    });

    if (line.dialogue) {
      const { name, portrait = 'default' } = line.dialogue;
      const emotions = emotionsOf.get(name);
      if (!emotions) {
        fail(
          `${at}.dialogue.name`,
          `"${name}" is not a character in this story`,
        );
      } else if (!emotions.includes(portrait)) {
        fail(
          `${at}.dialogue.portrait`,
          `"${portrait}" is not one of ${name}'s emotions`,
        );
      }
    }
  });

  for (const [name, flag] of Object.entries(script.flags ?? {})) {
    const at = `flags.${name}`;
    // Flags are stored as a Mongoose Map, whose keys can't contain these
    if (name.includes('.') || name.startsWith('$')) {
      fail(at, 'flag names cannot contain "." or start with "$"');
    }
    const lineId = (flag as unknown as Record<string, unknown> | null)?.line_id;
    if (
      typeof flag !== 'object' ||
      flag === null ||
      Object.keys(flag).length !== 1 ||
      !Number.isInteger(lineId)
    ) {
      fail(at, 'each flag must be an object with only an integer line_id');
    } else if ((lineId as number) < 0 || !isLine(lineId as number)) {
      fail(`${at}.line_id`, 'line_id must point to a line in lines');
    }
  }

  return errors;
}

/**
 * Turns a checked script into what's stored: each line keeps only its one
 * kind, and placeholders the client left out are filled in (portrait
 * "default", text_color and condition null, variables []).
 */
export function toStoredScript(script: ScriptDto) {
  const lines = script.lines.map((line): ScriptLine => {
    const { line_id } = line;
    const [kind] = kindsOf(line);
    switch (kind) {
      case 'dialogue': {
        const { name, portrait = 'default', text } = line.dialogue!;
        return {
          line_id,
          dialogue: { name, portrait, text, text_color: null },
        };
      }
      case 'prose':
        return { line_id, prose: { text: line.prose!.text, text_color: null } };
      case 'choice':
        return {
          line_id,
          choice: line.choice!.map(({ goto_line, option_body }) => ({
            goto_line,
            option_body,
            condition: null,
          })),
        };
      case 'background':
        return { line_id, background: line.background };
      case 'goto_line':
        return { line_id, goto_line: line.goto_line };
      default:
        return { line_id, end: true };
    }
  });

  return {
    flags: Object.fromEntries(
      Object.entries(script.flags ?? {}).map(([name, { line_id }]) => [
        name,
        { line_id },
      ]),
    ),
    variables: [],
    lines,
  };
}
