import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

// The parsed chapter script the reader plays, as agreed in the story JSON
// contract. Field names are snake_case to match that contract exactly.
// Every part is a sub-document with `_id: false`, since line_id and flag
// names already identify them.

/** A sentence split into words, as the parser produces it. */
@Schema({ _id: false })
export class ScriptText {
  @Prop({ type: [String], required: true })
  words: string[];
}

export const ScriptTextSchema = SchemaFactory.createForClass(ScriptText);

/** A character speaking. `name` is one of the story's characters. */
@Schema({ _id: false })
export class DialogueLine {
  @Prop({ required: true })
  name: string;

  // One of that character's emotions; "default" when the script doesn't set one
  @Prop({ required: true })
  portrait: string;

  @Prop({ type: ScriptTextSchema, required: true })
  text: ScriptText;

  // Placeholder for a later sprint
  @Prop({ type: String, default: null })
  text_color: string | null;
}

export const DialogueLineSchema = SchemaFactory.createForClass(DialogueLine);

/** Narration: any text that isn't a character speaking. */
@Schema({ _id: false })
export class ProseLine {
  @Prop({ type: ScriptTextSchema, required: true })
  text: ScriptText;

  // Placeholder for a later sprint
  @Prop({ type: String, default: null })
  text_color: string | null;
}

export const ProseLineSchema = SchemaFactory.createForClass(ProseLine);

/** One button of a choice; picking it jumps to `goto_line`. */
@Schema({ _id: false })
export class ChoiceOption {
  @Prop({ required: true, min: 0 })
  goto_line: number;

  @Prop({ required: true })
  option_body: string;

  // Placeholder: will hide the option unless a story variable is true
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  condition: null;
}

export const ChoiceOptionSchema = SchemaFactory.createForClass(ChoiceOption);

/**
 * One entry in `lines`. Exactly one of dialogue, prose, choice, background,
 * goto_line or end is set; the others are left out entirely.
 */
@Schema({ _id: false })
export class ScriptLine {
  // Position in `lines`, from 0; what goto_line and flags point to
  @Prop({ required: true, min: 0 })
  line_id: number;

  @Prop({ type: DialogueLineSchema })
  dialogue?: DialogueLine;

  @Prop({ type: ProseLineSchema })
  prose?: ProseLine;

  // default: undefined stops Mongoose adding `choice: []` to every line
  @Prop({ type: [ChoiceOptionSchema], default: undefined })
  choice?: ChoiceOption[];

  // Image to switch the background to, e.g. "cabin-door.jpg"
  @Prop({ type: String })
  background?: string;

  @Prop({ type: Number, min: 0 })
  goto_line?: number;

  @Prop({ type: Boolean })
  end?: true;
}

export const ScriptLineSchema = SchemaFactory.createForClass(ScriptLine);

/** A bookmark: a named place in `lines`. */
@Schema({ _id: false })
export class Flag {
  @Prop({ required: true, min: 0 })
  line_id: number;
}

export const FlagSchema = SchemaFactory.createForClass(Flag);

/**
 * A chapter's whole script: the `story` object of the contract.
 * The reader starts at lines[0] and follows it from there.
 */
@Schema({ _id: false })
export class Script {
  // Keyed by flag name; toJSON turns the Map into a plain object
  @Prop({ type: Map, of: FlagSchema, default: {} })
  flags: Map<string, Flag>;

  // Placeholder: story variables come in a later sprint, always [] for now
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  variables: unknown[];

  @Prop({ type: [ScriptLineSchema], default: [] })
  lines: ScriptLine[];
}

export const ScriptSchema = SchemaFactory.createForClass(Script);
