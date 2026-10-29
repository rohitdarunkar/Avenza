import { calculateTransactionSummary, groupExpensesByCategory } from "../utils/transactionCalculations";
import { toFiniteNumber } from "../utils/currency";

const key = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export function shiftMonth(date = new Date(), offset = 0) {
  return new Date(date.getFullYear(), date.getMonth()+offset, 1);
}
export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth()+1, 0);
  return { startDate:key(start), endDate:key(end), daysInMonth:end.getDate() };
}
export function getMonthTransactions(transactions = [], date = new Date()) {
  const {startDate,endDate}=getMonthRange(date);
  return transactions.filter(t => String(t?.date||"")>=startDate && String(t?.date||"")<=endDate);
}
export function getMonthlyComparison(transactions = [], date = new Date()) {
  const current=calculateTransactionSummary(getMonthTransactions(transactions,date));
  const previous=calculateTransactionSummary(getMonthTransactions(transactions,shiftMonth(date,-1)));
  const change=(a,b)=>b===0?(a===0?0:null):((a-b)/Math.abs(b))*100;
  return {current,previous,incomeChange:change(current.income,previous.income),expenseChange:change(current.expenses,previous.expenses),balanceChange:change(current.balance,previous.balance)};
}
export function getMonthlyTrend(transactions = [], date = new Date(), count = 6) {
  const size=Math.max(1,Math.min(24,Math.floor(toFiniteNumber(count))||6));
  const first=shiftMonth(date,-(size-1));
  return Array.from({length:size},(_,i)=>{
    const month=shiftMonth(first,i);
    const s=calculateTransactionSummary(getMonthTransactions(transactions,month));
    return {key:`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`,label:month.toLocaleDateString("en-IN",{month:"short"}),fullLabel:month.toLocaleDateString("en-IN",{month:"long",year:"numeric"}),income:s.income,expenses:s.expenses,balance:s.balance};
  });
}
export function getDailyTrend(transactions = [], date = new Date()) {
  const {daysInMonth}=getMonthRange(date);
  const rows=Array.from({length:daysInMonth},(_,i)=>{const d=new Date(date.getFullYear(),date.getMonth(),i+1);return {date:key(d),day:i+1,income:0,expenses:0};});
  const lookup=new Map(rows.map(row=>[row.date,row]));
  transactions.forEach(t=>{const row=lookup.get(String(t?.date||""));if(!row)return;const amount=Math.max(0,toFiniteNumber(t.amount));if(t.type==="income")row.income+=amount;if(t.type==="expense")row.expenses+=amount;});
  return rows;
}
export function buildFinancialObservations(transactions = [], date = new Date()) {
  const month=getMonthTransactions(transactions,date);
  const summary=calculateTransactionSummary(month);
  const categories=groupExpensesByCategory(month);
  const comparison=getMonthlyComparison(transactions,date);
  const result=[];
  if(!month.length)return [{id:"no-data",tone:"neutral",title:"Your month starts here",message:"No transactions are recorded for this month yet. Add income or expenses to unlock personalized insights."}];
  if(summary.income>0){
    if(summary.savingsRate<0)result.push({id:"overspend",tone:"warning",title:"Spending is above income",message:`Recorded expenses exceed income by ₹${Math.abs(summary.balance).toLocaleString("en-IN",{maximumFractionDigits:2})} this month.`});
    else result.push({id:"savings",tone:summary.savingsRate>=20?"positive":"neutral",title:summary.savingsRate>=20?"You're keeping a healthy share":"Room to grow your savings",message:`Your net savings rate is ${summary.savingsRate.toFixed(1)}% this month, based on recorded transactions.`});
  } else if(summary.expenses>0) result.push({id:"income-missing",tone:"neutral",title:"No income recorded",message:"Expenses are recorded, but income is not. Add income for a more complete financial picture."});
  if(categories[0])result.push({id:"top-category",tone:"neutral",title:`${categories[0].category} is your largest expense`,message:`It accounts for ${categories[0].percentage.toFixed(1)}% of recorded expenses this month.`});
  if(comparison.previous.expenses>0&&comparison.expenseChange!==null&&Math.abs(comparison.expenseChange)>=5){const up=comparison.expenseChange>0;result.push({id:"expense-change",tone:up?"warning":"positive",title:up?"Expenses increased":"Expenses decreased",message:`Recorded expenses are ${Math.abs(comparison.expenseChange).toFixed(1)}% ${up?"higher":"lower"} than the previous month.`});}
  return result;
}
export function getInsightsAnalytics(transactions = [], date = new Date()) {
  const month=getMonthTransactions(transactions,date);
  const summary=calculateTransactionSummary(month);
  const today=new Date();
  const days=today.getFullYear()===date.getFullYear()&&today.getMonth()===date.getMonth()?today.getDate():getMonthRange(date).daysInMonth;
  return {month:getMonthRange(date),summary,expensesByCategory:groupExpensesByCategory(month),monthlyTrend:getMonthlyTrend(transactions,date,6),dailyTrend:getDailyTrend(month,date),comparison:getMonthlyComparison(transactions,date),observations:buildFinancialObservations(transactions,date),averageDailySpend:days>0?summary.expenses/days:0,transactionCount:month.length,hasTransactions:month.length>0};
}
