This is meant as a guide to help you locate and resolve the most common issues running MTG Arena Tool (Mtgatool). **Please** only follow these steps if you encounter one of the issues mentioned.

Common paths:
- Output log: `%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\`
- Mtgatool data: `%APPDATA%\mtg-arena-tool`
- Mtgatool data (linux): `~/.config/MTG-Arena-Tool/`

### Stuck on 'please wait a minute' (without loading %)

Refer to this issue, the solution is in the comments;
[github.com/Manuel-777/MTG-Arena-Tool/issues/112](https://github.com/Manuel-777/MTG-Arena-Tool/issues/112)

### "No log file found" error or "Output log contains no user data"

Close MTG Arena (MTGA) and Mtgatool, then start MTG Arena. Once MTG Arena is loaded run Mtgatool again.

If that does not work, go to `%APPDATA%/mtg-arena-tool/` and delete `settings.json`, then load Mtgatool again.
You might be asked to point at the path of the output log again.

### Screen does not respond to mouse events (overlay covers)

Toggle Edit mode (default `Alt + Shift + E`) or toggle an overlay.

### If the app freezes in loading "Just a second" page:
This is probably caused by an error reading the user configuration, probably due to an unhandled exception or new data added from MTGA that Mtgatool is not handling properly. Bear in mind this issue is **not** because of a bad or improper installation, so reinstalling will make no difference. Altrough, you can roll back to a previous version safely if an update caused it.

Locate your log and config files;
- Go to the Mtgatool "Settings" page (gear icon), then click on "Data"
- copy the path to the "Arena Log"
- Close MTGA and Mtgatool.
- open the "Arena Log" path in a file browser
- Rename `output_log.txt`, do not delete it!
- Run MTGA, once open, run Mtgatool again.

If this works, send the the old log file file to [mtgatool@gmail.com](mailto:mtgatool@gmail.com) to analyze the error.

If that does not work;
- Go to the Mtgatool "Settings" page (gear icon), then click on "Data"
- In the bottom section called "Local Data", click on the link next to "Current player settings and history" (the .json file named with your User ID, something like `0A1F2E3E4D5C6B7A.json`)
- Rename the file, adding something to the end. **Do not delete it!**
- Run Mtgatool again.

If the last step worked, send your user-data file to [mtgatool@gmail.com](mailto:mtgatool@gmail.com) and I will inspect what is wrong with it.

### I want to reset all my historical data

If the amount of data is __small__ you can archive it all. The intended purpose of archiving is to remove from stats and hide from the UI.

If you have a patreon subscription with data syncing it is best to directly email [mtgatool@gmail.com](mailto:mtgatool@gmail.com). Otherwise some deleted data will be resynced.

Otherwise, with a large amount of bad data, it's best to rename the *user-data file*. (the .json file named with your User ID, something like `0A1F2E3E4D5C6B7A.json`)

### If you have any other unexpected behaviour

First of all, uninstalling and installing again will probably not change anything, as most errors are either configuration errors or log processing errors. Neither of them are solved by uninstalling. So, just to save you some time, make sure you have the latest version only.

Run the app then use `Alt+Shift+D` to open three developer consoles, one for each process (main, overlay and background).
Check if any of them has errors. If you see anything here (or anywhere else, really) you can submit to:
- [Discord](https://discord.gg/K9bPkJy)
- [Github issues](https://github.com/Manuel-777/MTG-Arena-Tool/issues)
- [mtgatool@gmail.com](mailto:mtgatool@gmail.com)
