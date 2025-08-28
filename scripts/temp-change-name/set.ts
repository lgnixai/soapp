import { changeName, revertName } from "./module";

const args = process.argv;

// Grab Temp App Name
const nameIndex = args.findIndex((val) => val === "--name");
if (nameIndex === -1) {
  console.error("No name provided");
  process.exit(1);
}

const newName = args[nameIndex + 1];

// Revert the app name before setting the new name
revertName();

// Change the app name using the module function
changeName(newName);
