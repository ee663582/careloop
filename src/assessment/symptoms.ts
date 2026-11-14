import type {SymptomSelection} from './types';

export const SYMPTOM_CATALOG:SymptomSelection[]=[
  {id:'headache',label:'Headache'}, {id:'dizziness',label:'Dizziness'}, {id:'nausea',label:'Nausea'},
  {id:'stomach-pain',label:'Stomach pain'}, {id:'chest-pain',label:'Chest discomfort or pain'},
  {id:'breathing-difficulty',label:'Difficulty breathing'}, {id:'fever',label:'Fever'},
  {id:'cough',label:'Cough'}, {id:'fatigue',label:'Tiredness or fatigue'}, {id:'rash',label:'Rash or skin change'},
  {id:'back-pain',label:'Back pain'}, {id:'joint-pain',label:'Joint pain'}, {id:'numbness',label:'Numbness or tingling'},
  {id:'swelling',label:'Swelling'}, {id:'vision-change',label:'Vision change'}, {id:'other',label:'Other symptom'}
];

const aliases:Record<string,string[]>={
  headache:['headache','head pain','head hurts','migraine'], dizziness:['dizziness','dizzy','lightheaded','vertigo'],
  nausea:['nausea','nauseous','feel sick'], 'stomach-pain':['stomach pain','stomach ache','abdominal pain','tummy pain'],
  'chest-pain':['chest pain','chest discomfort','chest tightness'], 'breathing-difficulty':['shortness of breath','difficulty breathing','trouble breathing','breathless'],
  fever:['fever','high temperature','temperature'], cough:['cough','coughing'], fatigue:['fatigue','tired','tiredness','exhausted'],
  rash:['rash','skin change','itchy skin'], 'back-pain':['back pain','backache'], 'joint-pain':['joint pain','joint ache'],
  numbness:['numbness','numb','tingling','pins and needles'], swelling:['swelling','swollen'], 'vision-change':['blurred vision','vision change','vision changes']
};

export function extractSymptoms(transcript:string):SymptomSelection[]{
  const text=transcript.toLowerCase();
  return SYMPTOM_CATALOG.filter(s=>s.id!=='other'&&(aliases[s.id]??[s.label.toLowerCase()]).some(term=>text.includes(term)));
}

export function followUpPrompts(symptoms:SymptomSelection[]):string[]{
  const prompts=['When did this start?','Did it begin suddenly or gradually?','How often has it happened?'];
  if(symptoms.some(s=>['headache','chest-pain','back-pain','stomach-pain','joint-pain'].includes(s.id)))prompts.push('How severe is it on a scale of 1 to 10?');
  if(symptoms.some(s=>s.id==='fever'))prompts.push('Was a temperature measured? If so, what was it?');
  if(symptoms.some(s=>s.id==='dizziness'))prompts.push('Did you faint or lose consciousness?');
  if(symptoms.some(s=>s.id==='breathing-difficulty'||s.id==='chest-pain'))prompts.push('Is this severe or rapidly worsening right now?');
  return [...new Set(prompts)];
}
