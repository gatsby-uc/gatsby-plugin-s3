#!/usr/bin/env node

import '@babel/polyfill';
import 'fs-posix';
import yargs, { Argv } from 'yargs';

import { deploy } from './deploy';

const cli: any = yargs();

cli
    .command(
        ['deploy', '$0'],
        'Deploy bucket. If it doesn\'t exist, it will be created. Otherwise, it will be updated.',
        (args: Argv) => {
            args.option('yes', {
                alias: 'y',
                describe: 'Skip confirmation prompt',
                boolean: true,
            });
            args.option('bucket', {
                alias: 'b',
                describe: 'Bucket name (if you wish to override default bucket name)',
            });
        },
        deploy
    )
    .wrap(cli.terminalWidth())
    .demandCommand(1, `Pass --help to see all available commands and options.`)
    .strict()
    .showHelpOnFail(true)
    .recommendCommands()
    .parse(process.argv.slice(2));
