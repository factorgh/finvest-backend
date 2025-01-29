import { v4 as uuidv4 } from "uuid"; // Import the v4 method for generating UUIDs

export const generateTransactionId = () => {
  return uuidv4(); // Generates a unique UUID
};

export const calculateDailyRate = (principal, expectedRate, quarterDays) => {
  const returnValue = (principal * expectedRate) / 100 / quarterDays;
  return returnValue;
};
