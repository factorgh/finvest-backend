import { v4 as uuidv4 } from "uuid"; // Import the v4 method for generating UUIDs

export const generateTransactionId = () => {
  return uuidv4(); // Generates a unique UUID
};
