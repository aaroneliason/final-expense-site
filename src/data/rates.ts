/**
 * Sample monthly premiums shown on the site.
 * Florida Rule 69B-150.114: an ad that shows a rate must name the insurer.
 * Every row needs a real quote Aaron ran himself (carrier quote tool), the plan name and the date.
 * Rows with `placeholder: true` render as "coming soon" in preview and BLOCK a production build.
 */
export type RateRow = {
  age: number;
  sex: 'Female' | 'Male';
  tobacco: boolean;
  face: number; // coverage amount in dollars
  monthly: number | null; // dollars per month
  insurer: string; // legal or commonly used insurer name, as approved
  plan: string; // product / plan name
  benefit: 'Level' | 'Graded' | 'Guaranteed issue (graded)';
  quotedOn: string; // ISO date the quote was run
  placeholder?: boolean;
};

const ph = (age: number, sex: RateRow['sex']): RateRow => ({
  age,
  sex,
  tobacco: false,
  face: 10000,
  monthly: null,
  insurer: 'TODO insurer',
  plan: 'TODO plan',
  benefit: 'Level',
  quotedOn: 'TODO',
  placeholder: true,
});

export const sampleRates: RateRow[] = [
  ph(60, 'Female'), ph(60, 'Male'),
  ph(65, 'Female'), ph(65, 'Male'),
  ph(70, 'Female'), ph(70, 'Male'),
  ph(75, 'Female'), ph(75, 'Male'),
  ph(80, 'Female'), ph(80, 'Male'),
];
