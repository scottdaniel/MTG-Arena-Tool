const electron = require("electron");
const ipc = electron.ipcRenderer;

//
ipc.on("update_progress", (event, arg) => {
  console.log(arg);
});

// The state is an object that looks like this:
// {
//     percent: 0.5,
//     speed: 554732,
//     size: {
//         total: 90044871,
//         transferred: 27610959
//     },
//     time: {
//         elapsed: 36.235,
//         remaining: 81.403
//     }
// }