export type MatchStrength='Low'|'Fair'|'Moderate'|'Strong';
export type FollowUpAnswer=string|number|boolean;
export interface SymptomSelection {id:string;label:string}
export interface AssessmentInput {
  age:number;
  bodyType:'Female'|'Male';
  symptoms:SymptomSelection[];
  locations:string[];
  freeTextLocations:string[];
  locationUncertain:boolean;
  onset:string;
  onsetPattern:string;
  duration:string;
  severity:number;
  frequency:string;
  answers:Record<string,FollowUpAnswer>;
}
export interface ClinicalSource {title:string;url:string;version?:string}
export interface ConditionRule {id:string;name:string;summary:string;details:string;treatment:string[];symptomWeights:Record<string,number>;requiredSymptoms?:string[];excludedSymptoms?:string[];minAge?:number;maxAge?:number;bodyTypes?:Array<'Female'|'Male'>}
export interface ClinicallyReviewedKnowledgeBase {version:string;status:'clinically-reviewed';reviewedAt:string;reviewers:string[];sources:ClinicalSource[];conditions:ConditionRule[]}
export interface ConditionMatch {condition:ConditionRule;strength:MatchStrength;matchedSymptoms:string[];missingRequired:string[]}
export type AssessmentResult={status:'knowledge-base-unavailable';matches:[]}|{status:'matched';matches:ConditionMatch[]};
