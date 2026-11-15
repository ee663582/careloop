import {useState} from 'react';
import {Activity,Heart,LoaderCircle} from 'lucide-react';
import SymptomChecker,{type SymptomJournalEntry}from'./SymptomChecker';
import type{Account}from'./types';

export interface HistoryEntry {
 id:string;
 date:string;
 title:string;
 description:string;
 locations:string[];
 source:string;
}
interface Props {
 account:Account;
 bodyType:'Female'|'Male';
 onSave:(entry:SymptomJournalEntry)=>Promise<void>;
 onTranscribe:(audio:Blob,language:string)=>Promise<string>;
 onSynthesize:(text:string,language:string)=>Promise<Blob>;
 loadHistory:()=>Promise<HistoryEntry[]>;
}

export default function PatientExperience({account,bodyType,onSave,onTranscribe,onSynthesize,loadHistory}:Props){
 const[view,setView]=useState<'checker'|'history'>('checker');
 const[entries,setEntries]=useState<HistoryEntry[]>([]),[loading,setLoading]=useState(false),[historyError,setHistoryError]=useState('');
 async function openHistory(){setView('history');setLoading(true);setHistoryError('');try{setEntries(await loadHistory())}catch{setHistoryError('Health history could not be loaded. Please try again.')}finally{setLoading(false)}}
 return <>
  <nav className="patient-view-tabs" aria-label="Patient health pages">
   <button className={view==='checker'?'active':''} aria-current={view==='checker'?'page':undefined} onClick={()=>setView('checker')}><Activity size={15}/> Symptom checker</button>
   <button className={view==='history'?'active':''} aria-current={view==='history'?'page':undefined} onClick={()=>void openHistory()}><Heart size={15}/> Health history</button>
  </nav>
  {view==='checker'?<SymptomChecker account={account} bodyType={bodyType} onSave={onSave} onTranscribe={onTranscribe} onSynthesize={onSynthesize} onSaved={()=>void openHistory()}/>:<section className="health-history-page">
   <h2>Your health history</h2><p className="health-history-intro">CARELOOP brings together the information you’ve added. Imported hospital reports, appointments, and vital readings will appear here when connected.</p>
   <div className="history-section-label">SYMPTOM REPORTS</div>
   {loading?<div className="history-empty"><LoaderCircle size={18}/> Loading your history…</div>:historyError?<div className="history-empty" role="alert">{historyError}<br/><button className="secondary-btn" onClick={()=>void openHistory()}>Try again</button></div>:entries.length?entries.map(entry=><article className="history-record" key={entry.id}><time>{formatDate(entry.date)}</time><h3>{entry.title}</h3><p>{entry.description}</p>{entry.locations.length>0&&<small>Locations: {entry.locations.join(', ')}</small>}<br/><small>{entry.source}</small></article>):<div className="history-empty">No symptom reports have been saved yet. Complete a checker entry and it will appear here.</div>}
   <div className="history-section-label">RECORDS, VISITS & VITALS</div><div className="history-not-connected">Hospital reports, doctor details, appointments, blood pressure, and heart-rate readings are not connected to this history view yet. No records are being invented or shown as real.</div>
  </section>}
 </>;
}
function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.valueOf())?value:date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}
