import {z} from 'zod';
import {dateSchema} from './values';
import {prescriptionSchema} from './program-schema';
export const targetRevisionSchema=z.object({id:z.string(),sessionId:z.string(),prescriptions:z.array(prescriptionSchema),reason:z.string(),createdAt:z.string(),kind:z.enum(['substitution','alternative','velocity','manual','bridge'])});
export type TargetRevision=z.infer<typeof targetRevisionSchema>;
export const enrollmentSchema=z.object({
 id:z.string(),programId:z.enum(['lp','up']),programVersion:z.literal('lp-up-v2'),entrySessionId:z.string(),startDate:dateSchema,status:z.enum(['queued','active','paused','cancelled','completed']),
 reschedules:z.record(z.string(),dateSchema),skippedSessionIds:z.array(z.string()),continuationSessionId:z.string().nullable(),
 events:z.array(z.object({id:z.string(),type:z.string(),date:dateSchema,at:z.string()})),
 targetRevisions:z.array(targetRevisionSchema),
 bridge:z.object({id:z.string(),startDate:dateSchema,endDate:dateSchema,sessions:z.array(z.object({sessionId:z.string(),sourceSessionId:z.string(),date:dateSchema,prescriptions:z.array(prescriptionSchema)}))}).nullable().default(null),
});
export type Enrollment=z.infer<typeof enrollmentSchema>;
