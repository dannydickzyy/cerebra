# CEREBRA user acceptance checklist

To be completed by the team with intended users. Automated tests do not replace user acceptance testing.

Use fictional aliases and test data. Record the app version, browser, screen size, date, and participant code.

| Task | Expected outcome | Pass / Issue |
| --- | --- | --- |
| Open dashboard | Source dataset clearly distinguished from saved screenings | |
| Switch light/dark mode | Text, controls, and charts remain readable | |
| Submit incomplete or out-of-range profile | Validation prevents prediction | |
| Enter all 10 predictors, including gender | Actual trained model returns a score and explanation | |
| Use Unknown smoking and unavailable BMI | Prediction runs and missing BMI is handled | |
| Change a field after predicting | Previous result cannot be saved as if it matched new inputs | |
| Save a screening | Record appears once in Screened patients | |
| Reload or restart | Saved record and explanation remain available | |
| Search and apply risk/date/site filters | Only matching records appear | |
| Export filtered records | CSV contains the same matched records | |
| Open risk breakdown | Signed contributions and baseline explain the score | |
| Mark contacted | Status persists in the record and population backlog updates | |
| Open model performance | Actual metrics and unmet recall target are understandable | |
| Use a phone-sized viewport | Navigation, form, and results remain usable | |

Ask each participant to rate 1 (strongly disagree) to 5 (strongly agree):

1. I can complete a screening without assistance.
2. I can tell the difference between the source dataset and saved screenings.
3. I understand that the displayed model score is not a clinical diagnosis or validated risk probability.
4. I can understand which features increased or decreased the model score.
5. I can find, filter, and review a saved record.
6. The layout, labels, and charts are readable.

Record free-text issues and improvement suggestions. Do not report usability acceptance until respondents have actually completed this exercise.
