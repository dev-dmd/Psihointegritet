The company should not go through the selection of therapists intended for individuals.

Important: The "3-10" and "10+" ranges overlap. I suggest:

individual access: 1–2 persons;
small team: 3–9 people;
company: 10+ employees.
1. Entry into flow

If the user answers the question "Who are you looking for support for?" choose:

Working with companies

a special flow opens:

Title

Employee support program

Description

Create a rough support model based on team size, employee needs, and term usage. Filling out takes about two minutes and does not require the entry of employees' health data.

A button

Configure the program

I wouldn't call it an "EAP program" right now, as that name often implies a broader system of services, availability, reporting, and organizational support. "Employee Support Program" is more accurate for Psychointegrity's initial offering.

2. Hardcoded questions
Step 1 — What do you want to enable employees to do?

Multiple answer choices are possible:

Confidential one-on-one conversations
Support in stress management
Prevention of exhaustion and burnout
Support for parents
Support to managers and executives
Better communication and relationships in the team
Workshops and educational programs
Support during organizational changes
We need a recommendation
Something else

An optional text field is displayed under "Something else".

Step 2 — How many people should have access?
1–2 persons
3–9 persons
10–30 people
31–100 persons
More than 100 people
We don't know yet

This response determines the package, but should not automatically determine the number of sessions. A company of 100 employees may only want ten appointments per month.

Step 3 — How do you want the program to be used?

Flexible terms

Employees use the pre-purchased pool of appointments when they need support. Appointments depend on the current availability of therapists.

Reserved capacity

A certain number of appointments each month are reserved only for your company.

Hybrid model

The company has reserved basic capacity, with the possibility of purchasing additional terms.

Workshops and education

We need group educations, workshops or a program intended for the team.

We are not sure

We want Psychointegrity to propose a suitable model.

Step 4 — How is support funded?
The company pays for all appointments
The company provides a limited number of appointments per employee
The company finances the initial terms, and the employee can continue independently
A company buys a futures mutual fund
We need a recommendation

For privacy, the code or invitation model is best: the employee gets access, but HR does not see the content of the conversation or the answers given by the employee.

Step 5 — Cooperation period
One time support
A three-month pilot
Six months
Twelve months
Continuous cooperation
We haven't decided yet

If they select 12 months, an additional question is displayed:

How many appointments do you want to book each month?

4 terms
8 appointments
12 appointments
20 appointments
We need an assessment
Step 6 — Method of realization
Online
Live in Niš
Live in Leskovac
Combined
In the company's premises
We need a recommendation

Arrival at the company should be marked as an option "by appointment", because it depends on the city, the number of participants and the type of activity.

Step 7 — Contact

Required fields:

Company name
Name and surname of the contact person
Business email
Number of employees or approximate team size

Optional fields:

Phone
Deadline for starting the program
Additional message

Checkbox:

I agree to be contacted by Psychointegrity regarding this inquiry.

Button:

Send a request for the program

3. Result before sending

Before the contact form, I would display a hardcoded recommendation:

Based on your answers we recommend: Team Flex

The program allows employees to use a shared pool of appointments when they need support. Scheduling is confidential, and the company only receives an aggregated overview of program utilization.

Show:

recommended package;
usage model;
number of terms included;
indicative price;
duration;
what the company gets;
"Request a quote" button.

It immediately shows the value of the platform, even though the demo does not yet have a backend and a Booking Engine.

4. Demo package proposal and price

These are working, hardcoded prices for demonstration purposes. The initial assumption is RSD 5,000 per individual appointment. Anja needs to confirm the basic price, tax treatment, cancellation policy and workshop price.

Package Intended Model Demo price
Individual voucher for 1-2 persons Payment of individual appointments RSD 5,000 per appointment
Team Flex 4 3-9 employees 4 flexible appointments per month RSD 20,000 per month
Team Flex 8 3-9 employees 8 flexible appointments per month RSD 38,000 per month
Company Flex 10 10+ employees 10 flexible appointments per month RSD 47,500 per month
Company Partner 10+ employees Larger pool of appointments, workshops and management support Price per offer
Reserved Capacity All sizes Yearly reserved dates According to the selected capacity

I wouldn't give a big discount for a three-month pilot. Its value is that the company can test interest without an annual commitment.

5. Annual term lease

For demo you can display the following:

Reserved capacity Monthly Annual advance payment
4 appointments per month RSD 20,000
228,000 RSD
8 appointments per month RSD 40,000 RSD 456,000
12 appointments per month RSD 60,000 RSD 684,000
20 appointments per month RSD 100,000 Price per offer

Annual amounts in the example include a 5% prepayment discount.

The difference should be clearly shown:

Flexible fund: the company buys loans, but does not have a guaranteed specific term.
Reserved capacity: Psychointegrity keeps the contracted number of appointments only for that company.
Hybrid model: some appointments are guaranteed, and additional appointments are scheduled according to availability.

For reserved appointments, I suggest a business rule:

An unused term can be carried over to the next month at the latest. A reserved appointment that is not used or canceled within the agreed period is considered to have been used up.

Anja can later change the transfer and cancellation deadline.

6. Hardcoded recommendation logic
function recommendCompanyPlan(input) {
  if (input.primaryNeed === "workshops") {
    return "company-custom";
  }

  if (input.teamSize === "1-2") {
    return "individual-voucher";
  }

  if (input.scheduleModel === "reserved") {
    return "reserved-capacity";
  }

  if (input.scheduleModel === "hybrid") {
    return "company-partner";
  }

  if (input.teamSize === "3-9") {
    return input.expectedUsage === "higher"
      ? "team-flex-8"
      : "team-flex-4";
  }

  if (input.teamSize === "10-30") {
    return "company-flex-10";
  }

  return "company-custom";
}

For more than 30 employees, I would not automatically calculate the final price. The system can display:

The framework program has been prepared. Due to the size of the team, we define the final capacity and price after a short consultation.

7. Email that Anja and the team receive

Title:

[Companies] New inquiry — {company name} — {recommended package}

Content:

NEW INQUIRY FOR THE EMPLOYEE SUPPORT PROGRAM

Company: {companyName}
Contact person: {contactName}
Email: {email}
Phone: {phone}

Team Size: {teamSize}
Program Objectives: {selectedNeeds}
Usage: {scheduleModel}
Funding: {fundingModel}
Duration of cooperation: {duration}
Delivery mode: {deliveryMode}

Recommended Demo Plan: {recommendedPlan}
Approximate demo price: {estimatedPrice}

Additional message:
{message}

Automatic reply to the company:

Thank you for your interest in the employee support program. We have received your inquiry and outline requirements. A member of the Psychointegrity team will contact you to confirm needs, capacities and prepare a final offer.

8. Privacy and Boundaries

The company should not be given access to:

the employee's answers;
the reason for addressing;
the content of the conversation;
therapist's notes;
individual appointment history;
the identity of the person using the support, unless it is necessary for the invoicing model and the person is clearly informed about it.

For a team of 3-9 people, I would not show statistics by topic because the employees can be easily identified. The company can only see the number of purchased, used and remaining credits. With larger groups, anonymous summary statistics can be introduced later with a minimum sample threshold.

Fixed-fee, pay-as-you-go and bundled models are common with employee support programs. Such programs often combine individual support, management consulting and educational activities. Workplace Mental Health ["https://allonehealth.com/how-to-buy-a-comprehensive-employee-assistance-program-eap-in-the-u-s/?utm_source=chatgpt.com"], AllOne Health ["https://workplacementalhealth.org/mental-health-topics/employee-assistance-programs?utm_source=chatgpt.com"]

