This is meant as a guide to help you locate and resolve the most common issues running MTG Arena Tool. **Please** only follow these steps if you encounter one of the issues mentioned.

### If the app freezes in loading "Just a second" page:
This is probably caused by an error reading the user configuration, probably due to an unhandled exception or new data added from MTGA that mtgatool is not handling properly. Bear in mind this issue is **not** because of a bad or improper installation, so reinstalling will make no difference. Altrough, you can roll back to a previous version safely if an update caused it.

Locate your log and config files;
- Close MTG Arena and MTG Arena Tool.
- Go to `%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\`
- Rename `output.log`, do not delete it!
- Run MTG Arena, once open, run MTG Arena Tool again.

If this works, send the the old log file file to [mtgatool@gmail.com](mailto:mtgatool@gmail.com) to analyze the error.

If that does not work;
- Proceed to `%APPDATA%\mtg-arena-tool`
- Locate a .json file named with your User ID, something like `0A1F2E3E4D5C6B7A.json`
- Rename the file, adding something to the end. **Do not delete it!**
- Run MTG Arena Tool again.

If the last step worked, send the the .json file to [mtgatool@gmail.com](mailto:mtgatool@gmail.com) and I will inspect what is wrong with it.

### If you have any other unexpected behaviour

Run the app using the  `-debug` command, that should prompt three developer consoles, one for each process (main, overlay and background).
Check if any of them has errors. If you see anything here (or anywhere else, really) you can submit to:
- [Discord](https://discord.gg/K9bPkJy)
- [Github issues](https://github.com/Manuel-777/MTG-Arena-Tool/issues)
- [mtgatool@gmail.com](mailto:mtgatool@gmail.com)
