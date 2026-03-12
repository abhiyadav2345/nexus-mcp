import chalk from "chalk";

let VERBOSE = false;

export function setVerbose(verbose: boolean): void {
  VERBOSE = verbose;
}

export function debug(msg: string): void {
  if (VERBOSE) {
    process.stderr.write(chalk.dim(`[debug] ${msg}`) + "\n");
  }
}

export function verbose(msg: string): void {
  if (VERBOSE) {
    process.stderr.write(chalk.dim(`[verbose] ${msg}`) + "\n");
  }
}
