import dotenv from "dotenv";
import { ChildProcess, fork } from "child_process";
import * as readline from 'readline';

dotenv.config();

const commandsHelp = "\nInternxt CLI WebDAV Commands available\n\
--------------------------------------\n\n\
start      starts WebDAV server\n\n\
stop       stops WebDAV server\n\n\
quit       quit the CLI\n\n\
--------------------------------------\n\n";

let child_process: ChildProcess = null;

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Internxt CLI> ',
});

console.log(commandsHelp);
cli.prompt();


cli.on("line", async (line) => {
  const input = line.trim();
  switch (input) {
    case "start": {
      if (child_process === null) {
        child_process = fork(__dirname + '/webdav-server/server');
        child_process.send({ message: 'start', params: { hostname: '127.0.0.1', portParam: 3000 } });
        child_process.on('message', (message) => {
          console.log(`${message}\n`);
        });
      } else {
        process.stdout.write('WebDAV server not started\n')
      }
      break;
    }
    case "stop": {
      if (child_process !== null) {
        child_process.send({ message: 'stop' });
        child_process.on('message', (message) => {
          console.log(`${message}\n`);
        });
      } else {
        console.log('WebDAV server not started\n')
      }
      break;
    }
    case "exit":
    case "quit": {
      cli.close();
      break;
    }
    default: {
      console.log(commandsHelp);
    }
  }

  cli.prompt();
}).on('close', () => {
  console.log('Closing Internxt CLI... have a great day!');
  process.exit(0);
});;


