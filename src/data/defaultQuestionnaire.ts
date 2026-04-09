import type { RTQTemplate } from "../types/rtq";

export const DEFAULT_QUESTIONNAIRE: Omit<RTQTemplate, "id" | "firmId" | "updatedAt"> = {
  questions: [
    {
      id: "q1",
      text: "How many years do you expect to invest before needing to withdraw most of your funds?",
      weight: 1,
      choices: [
        { id: "q1a", text: "Less than 3 years", points: 1 },
        { id: "q1b", text: "3–5 years", points: 2 },
        { id: "q1c", text: "5–10 years", points: 3 },
        { id: "q1d", text: "More than 10 years", points: 4 },
      ],
    },
    {
      id: "q2",
      text: "If your portfolio dropped 20% in value over 6 months, what would you most likely do?",
      weight: 1.5,
      choices: [
        { id: "q2a", text: "Sell everything to stop further losses", points: 1 },
        { id: "q2b", text: "Sell some holdings to reduce my exposure", points: 2 },
        { id: "q2c", text: "Hold and wait for the portfolio to recover", points: 3 },
        { id: "q2d", text: "Buy more at the lower price", points: 4 },
      ],
    },
    {
      id: "q3",
      text: "How dependent are you on your investment portfolio for living expenses?",
      weight: 1,
      choices: [
        { id: "q3a", text: "Fully dependent — it is my primary income source", points: 1 },
        { id: "q3b", text: "Significantly dependent", points: 2 },
        { id: "q3c", text: "Somewhat dependent", points: 3 },
        { id: "q3d", text: "Not dependent — I have other reliable income", points: 4 },
      ],
    },
    {
      id: "q4",
      text: "What is your primary investment objective?",
      weight: 1,
      choices: [
        { id: "q4a", text: "Preserve capital — avoid losses entirely", points: 1 },
        { id: "q4b", text: "Generate stable income with minimal risk", points: 2 },
        { id: "q4c", text: "Moderate growth balanced with some income", points: 3 },
        { id: "q4d", text: "Maximum long-term growth", points: 4 },
      ],
    },
    {
      id: "q5",
      text: "Imagine your portfolio fluctuates significantly from week to week. How would you feel?",
      weight: 1.5,
      choices: [
        { id: "q5a", text: "Very uncomfortable — I would lose sleep over it", points: 1 },
        { id: "q5b", text: "Somewhat uncomfortable — I would be anxious", points: 2 },
        { id: "q5c", text: "Somewhat comfortable — I would stay the course", points: 3 },
        { id: "q5d", text: "Very comfortable — short-term noise does not bother me", points: 4 },
      ],
    },
    {
      id: "q6",
      text: "How would you describe your investing experience?",
      weight: 0.5,
      choices: [
        { id: "q6a", text: "None — I am brand new to investing", points: 1 },
        { id: "q6b", text: "Limited — I have basic knowledge", points: 2 },
        { id: "q6c", text: "Moderate — I understand most investment concepts", points: 3 },
        { id: "q6d", text: "Extensive — I am very familiar with financial markets", points: 4 },
      ],
    },
  ],
};
