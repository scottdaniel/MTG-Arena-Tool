const electron = require("electron");
const ipc = electron.ipcRenderer;

//
ipc.on("update_progress", (event, state) => {
  console.log(state);

  let progress = state.percent;
  let speed = Math.round(state.speed / 1024);
  let progressBar = document.getElementById("progressBar");
  progressBar.style.width = Math.round(progress * 100) + "%";

  document.getElementById("progressText").innerHTML = ` ${
    state.size.transferred
  } / ${state.size.total} (${speed}kb/s)`;
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
