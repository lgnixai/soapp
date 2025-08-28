/**
 * Temporary App Name Changer
 *
 * This script allows you to temporarily change your app's name while running a command,
 * then automatically reverts back to the original name when the command completes.
 *
 * Usage:
 *   bun command.ts --name "Temporary App Name" <command to run>
 *
 * Examples:
 *   bun command.ts --name "Dev Build" npm run dev
 *   bun command.ts --name "Testing App" npm test
 *   bun command.ts --name "Preview Build" npm run preview
 *
 * The script will:
 * 1. Change the productName in package.json to the specified name
 * 2. Run the provided command
 * 3. Revert the package.json to its original state when the command exits
 *    or when interrupted with Ctrl+C
 */

import { ChildProcess, spawn } from "child_process";
import { changeName, revertName } from "./module";

const args = process.argv.slice(2);

// Check for name parameter
const nameIndex = args.findIndex((val) => val === "--name");
if (nameIndex === -1) {
  console.error("No name provided. Use --name <new-name>");
  process.exit(1);
}

// Get the new name from arguments
const newName = args[nameIndex + 1];
args.splice(nameIndex, 2); // Remove --name and its value from args

// Get the command to run
if (args.length === 0) {
  console.error("No command provided");
  process.exit(1);
}

const command = args.join(" ");

// Function to revert changes
function revertAndExit(exitCode = 0) {
  revertName();
  process.exit(exitCode);
}

// Handle Ctrl+C and other termination signals
let childProcess: ChildProcess;

process.on("SIGINT", () => {
  // Forward SIGINT to the child process and let it terminate naturally
  if (childProcess) {
    childProcess.kill("SIGINT");
  } else {
    revertAndExit(0);
  }
});

process.on("SIGTERM", () => {
  // Forward SIGTERM to the child process and let it terminate naturally
  if (childProcess) {
    childProcess.kill("SIGTERM");
  } else {
    revertAndExit(0);
  }
});

try {
  // Change the app name
  console.log(`Temporarily changing app name to: ${newName}`);
  changeName(newName);

  // Run the provided command
  console.log(`Executing command: ${command}`);
  childProcess = spawn(command, [], {
    shell: true,
    stdio: "inherit"
  });

  // When the command completes, run the revert
  childProcess.on("exit", (code) => {
    console.log(`Command exited with code ${code}`);
    revertAndExit(code ?? undefined);
  });
} catch (error) {
  console.error("Error:", error);

  // Try to revert if there was an error
  revertAndExit(1);
}
