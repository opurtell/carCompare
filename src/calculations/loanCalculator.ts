export interface LoanScheduleYear {
  year: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calculateLoanSchedule(
  principal: number,
  annualRate: number,
  termYears: number
): LoanScheduleYear[] {
  if (principal <= 0 || termYears <= 0) return [];

  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const r = annualRate / 100 / 12;
  const schedule: LoanScheduleYear[] = [];
  let balance = principal;

  for (let year = 1; year <= termYears; year++) {
    let yearInterest = 0;
    let yearPrincipal = 0;

    for (let month = 0; month < 12; month++) {
      if (balance <= 0) break;
      const interest = balance * r;
      const principalPayment = Math.min(monthlyPayment - interest, balance);
      yearInterest += interest;
      yearPrincipal += principalPayment;
      balance -= principalPayment;
    }

    schedule.push({
      year,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      remainingBalance: Math.max(0, balance),
    });
  }

  return schedule;
}

export function getTotalInterest(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const schedule = calculateLoanSchedule(principal, annualRate, termYears);
  return schedule.reduce((sum, y) => sum + y.interestPaid, 0);
}
