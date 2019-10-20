import { createDiv, queryElements as $$ } from "./dom-fns";
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import ReactSelect from './ReactSelect';

function createSelect(
  parent,
  options,
  current,
  callback,
  divClass,
  optionFormatter
) {
  let selectContainer = createDiv(["select_container", divClass]);
  selectContainer.id = divClass;
  parent.appendChild(selectContainer);

  const props = {
    options, current, optionFormatter, divClass, callback,
  }

  ReactDOM.render(
    <ReactSelect {...props} />,
    selectContainer
  );

  return selectContainer;
}

export { createSelect, selectAdd };
function selectAdd(selectElement, callback) {
  selectElement.classList.add("select-hidden");

  // dom structure is
  // container
  //   selectElement
  //   styledSelect
  //   list

  var container = createDiv(["select"]);
  wrap(selectElement, container);

  var styledSelect = createDiv(
    ["select-styled"],
    selectElement.options[0].textContent
  );
  container.appendChild(styledSelect);

  var list = document.createElement("ul");
  list.className = "select-options";
  container.appendChild(list);

  // insert list entries
  [...selectElement.options].forEach(option => {
    var li = document.createElement("li");
    li.innerHTML = option.textContent;
    li.rel = option.value;
    list.appendChild(li);
  });

  // Open and close the dropdown
  styledSelect.addEventListener("click", evt => {
    evt.stopPropagation();

    // toggle current select
    if (styledSelect.classList.contains("active")) {
      styledSelect.classList.remove("active");
    } else {
      styledSelect.classList.add("active");
    }

    // disable other selects on the page
    $$("div.select-styled")
      .filter(select => select !== styledSelect)
      .forEach(select => select.remove("active"));
  });

  // var listItems = list.childNodes;
  list.addEventListener("click", evt => {
    evt.stopPropagation();
    var option = evt.target;
    console.log("option", option, evt);

    styledSelect.innerHTML = option.textContent;
    styledSelect.classList.remove("active");

    selectElement.value = option.rel;

    callback(selectElement.value);
  });

  // hide the select if the document is clicked.
  document.addEventListener("click", () => {
    styledSelect.classList.remove("active");
  });
}

// several utility functions to replace useful jQuery methods
function wrap(element, wrapper) {
  element.parentNode.insertBefore(wrapper, element);
  wrapper.appendChild(element);
  return element;
}
