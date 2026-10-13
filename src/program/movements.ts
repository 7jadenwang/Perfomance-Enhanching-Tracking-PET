import raw from './movement-library.json';
import type {Prescription,EquipmentProfile} from '../domain/schema';
export type Movement={id:string;name:string;english:string;aliases:string[];pattern:string;intent:string;direction:string;equipment:string[];skill:'basic'|'technical';demand:'low'|'moderate'|'high';unilateral:boolean;references:string[]};
export const movementLibrary=raw as Movement[];
export function movementFor(p:Pick<Prescription,'movementId'|'name'>):Movement|undefined{return p.movementId?movementLibrary.find(m=>m.id===p.movementId):movementLibrary.find(m=>m.name===p.name||m.aliases.includes(p.name));}
export function equipmentStatus(id:string,e:EquipmentProfile):'available'|'unavailable'|'unconfirmed'{
 if(id==='running')return 'available';
 if(['rowing','skiErg','airBike'].includes(id))return e[id as 'rowing'|'skiErg'|'airBike'];
 return e.extra[id]??(['barbell','rack','dumbbells','bench','bands','floor','cable'].includes(id)?'available':'unconfirmed');
}
