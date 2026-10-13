import raw from "./catalog.json";
import { parseProgram } from "../domain/schema";
export const program = parseProgram(raw);
