# VitasBot
A custom bot created for the 0.1% Discord community.


## Configuration

For the bot to work, there needs to be a `config.json` file in the main directory.
An example configuration looks like this:

```
{
    "DISCORD_TOKEN": "iAMaSUPERsecretTOKENdoNOTgiveMEtoANYONE666",
    "DATABASE_URL": [
        {
            "symbol": database_name,
            "url": "mongodb://username:password@host_ip:host_port/database_name?authSource=auth_database_name"
        }
    ]
}
```
## Starting the bot

To work, bot requires a running mongoDB database.
- how to set up database:
- command for the mongo daemon: `mongod --auth --fork --port MONGO_PORT --bind_ip 0.0.0.0 --dbpath /var/lib/mongodb --logpath /var/lib/mongod.log`

How to start the bot on Ubuntu remote server:
- clone the repository - `https://github.com/Arcyvilk/VitasBot.git`
- install dependencies - `npm install`
- don't forget to start mongoDB instance and set up the `config.json` file
- start the bot with `npm run vitas` command (or `forever start -c "npm run vitas" ./` if you want to rum daemon)

How to stop the daemon
- forever stop <process number>
- `ps -ef | grep vitas`
- `kill <PID>`

