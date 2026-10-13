import type {VelocityRule,VelocityRecord,Prescription} from '../domain/schema';
export type VelocityActionResult={actions:string[];observedLoss:number|null;ambiguous:boolean;reasons:string[];missing:string[];changes:VelocityRule['bands']};
export function evaluateVelocityRule(rule:VelocityRule,m:VelocityRecord,context:{experience?:'unconfirmed'|'beginner'|'experienced';enabled?:boolean}={}):VelocityActionResult{
 const result:VelocityActionResult={actions:[],observedLoss:null,ambiguous:false,reasons:[],missing:[],changes:[]};
 if(context.enabled===false)return result;
 if(rule.applicability==='experienced'&&context.experience!=='experienced'){result.missing.push('Confirm experience before applying the experienced-athlete rule');return result;}
 if(!rule.metric||rule.metric!==m.metric||rule.componentId!==m.componentId){result.missing.push('Matching velocity metric and exercise component required');return result;}
 if(rule.floor){
  if(rule.floor[0]!==rule.floor[1]){result.ambiguous=true;result.missing.push('Source floor is a range; confirm the intended floor');}
  else if(m.repVelocities.some(v=>v<rule.floor![0])){result.actions.push('stopSet');result.reasons.push('A measured rep is below the source velocity floor');}
 }
 if(!m.completeSeries||m.repVelocities.length<2||rule.lossReference==='unspecified'){result.missing.push('Complete rep series and source loss-reference definition required');return result;}
 const fastest=Math.max(...m.repVelocities);if(fastest<=0){result.missing.push('Positive fastest rep required');return result;}
 const comparison=rule.lossReference==='fastestAny'?Math.min(...m.repVelocities):m.repVelocities.at(-1)!;
 const loss=100*(fastest-comparison)/fastest;result.observedLoss=loss;
 const bands=rule.bands.filter(b=>{const rounded=Math.round(loss*1e9)/1e9;return(b.lowerInclusive?rounded>=b.loss[0]:rounded>b.loss[0])&&(b.upperInclusive?rounded<=b.loss[1]:rounded<b.loss[1]);});
 if(bands.length>1){result.ambiguous=true;result.reasons.push('Source bands overlap at this loss; review the original boundary');return result;}
 result.changes=bands;result.actions=[...new Set([...result.actions,...bands.map(b=>b.action)])];return result;
}
export function variantPrescription(p:Prescription,index:number):Prescription{
 const v=p.velocityVariants[index];if(!v)throw Error('Unknown source load/velocity variant');
 return {...p,loadPercent:v.loadPercent,velocityTarget:v.target,velocityMetric:v.metric,velocityRules:p.velocityRules.map(r=>({...r,floor:[v.floor,v.floor]}))};
}
