import {z} from 'zod';
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T12:00:00Z');return !isNaN(+d)&&d.toISOString().slice(0,10)===s;},'Invalid calendar date');
export type LocalDate=z.infer<typeof dateSchema>;
