var lastTab = -1;
var currentTab = -1;

// * libs
function tabChanged(tabInfo) {
  lastTab = currentTab;
  currentTab = tabInfo.tabId;
  console.log('entropy-simple-brower-shortcuts: Last tab id '
    + lastTab + ", Current tab id " + currentTab);
}
browser.tabs.onActivated.addListener(tabChanged);

function toggleRecentTab() {
  console.log('entropy-simple-brower-shortcuts: Prepare toggle recent tab');
  if (lastTab > -1) {
    console.log('--> toggle to tab id: ' + lastTab);
    browser.tabs.update(lastTab,{active: true});
  } else {
    console.log('--> No recent tab touched');
  }
}
browser.browserAction.onClicked.addListener(toggleRecentTab);

let selectTab = (direction) => {
  let searchParam = { currentWindow: true };
  searchParam.hidden = false;
  // if (process.env.VENDOR === 'firefox') {
  // searchParam.hidden = false;
  // }
  browser.tabs.query(searchParam).then(function(tabs) {
    if (tabs.length <= 1) {
      return
    }
    browser.tabs.query({currentWindow: true, active: true}).then(function(currentTabInArray) {
      let currentTab = currentTabInArray[0]
      let currentTabIndex = tabs.findIndex(i => i.id === currentTab.id);
      let toSelect
      switch (direction) {
      case 'next':
        toSelect = tabs[(currentTabIndex + 1 + tabs.length) % tabs.length]
        break
      case 'previous':
        toSelect = tabs[(currentTabIndex - 1 + tabs.length) % tabs.length]
        break
      case 'first':
        toSelect = tabs[0]
        break
      case 'last':
        toSelect = tabs[tabs.length - 1]
        break
      default:
        let index = parseInt(direction) || 0
        if (index >= 1 && index <= tabs.length) {
          toSelect = tabs[index - 1]
        } else {
          return
        }
      }
      browser.tabs.update(toSelect.id, {active: true})
    })
  })
}

let copyToClipboard = (text) => {
  let copyDiv = document.createElement('div')
  copyDiv.contentEditable = true
  document.body.appendChild(copyDiv)
  copyDiv.innerHTML = text
  copyDiv.unselectable = 'off'
  copyDiv.focus()
  document.execCommand('SelectAll')
  document.execCommand('Copy', false, null)
  document.body.removeChild(copyDiv)
}

// * main
browser.commands.onCommand.addListener(function(command) {
  let smoothScrolling = 'auto'; // or 'smooth' as force smooth
  console.log('entropy-simple-brower-shortcuts: Use command ' + command);
  if (command == "tab-toggle") {
    toggleRecentTab();
  } else if (command == 'cleardownloads') {
    browser.browsingData.remove({'since': 0}, {'downloads': true})
  } else if (command == 'viewsource') {
    browser.tabs.query({currentWindow: true, active: true}).then(function (tab) {
      browser.tabs.create({url: 'view-source:' + tab[0].url})
    })
  } else if (command == 'print') {
    browser.tabs.executeScript(null, {'code': 'window.print()'})
  } else if (command == 'nexttab') {
    selectTab('next')
  } else if (command == 'prevtab') {
    selectTab('previous')
  } else if (command == 'firsttab') {
    selectTab('first')
  } else if (command == 'lasttab') {
    selectTab('last')
  } else if (command == 'newtab') {
    browser.tabs.create({})
  } else if (command == 'reopentab') {
    browser.sessions.getRecentlyClosed({maxResults: 1}).then(function(sessions) {
      let closedTab = sessions[0]
      browser.sessions.restore(closedTab.sessionId)
    })
  } else if (command == 'closetab') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.remove(tab[0].id)
    })
  } else if (command == 'clonetab') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.duplicate(tab[0].id)
    })
  } else if (command == 'movetabtonewwindow') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.windows.create({url: tab[0].url})
      browser.tabs.remove(tab[0].id)
    })
  } else if (command == 'onlytab') {
    browser.tabs.query({currentWindow: true, pinned: false, active: false}).then(function(tabs) {
      let ids = []
      tabs.forEach(function (tab) {
        ids.push(tab.id)
      })
      browser.tabs.remove(ids)
    })
  } else if (command == 'closelefttabs' || command == 'closerighttabs') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
      let currentTabIndex = tabs[0].index
      browser.tabs.query({currentWindow: true, pinned: false, active: false}).then(function(tabs) {
        let ids = []
        tabs.forEach(function (tab) {
          if ((command == 'closelefttabs' && tab.index < currentTabIndex) ||
            (command == 'closerighttabs' && tab.index > currentTabIndex)) {
              ids.push(tab.id)
            }
        })
        browser.tabs.remove(ids)
      })
    })
  } else if (command == 'togglepin') {
    browser.tabs.query({active: true, currentWindow: true}).then(function(tab) {
      let toggle = !tab[0].pinned
      browser.tabs.update(tab[0].id, { pinned: toggle })
    })
  } else if (command == 'togglemute') {
    browser.tabs.query({active: true, currentWindow: true}).then(function(tab) {
      let toggle = !tab[0].mutedInfo.muted
      browser.tabs.update(tab[0].id, { muted: toggle })
    })
  } else if (command == 'copyurl') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      console.log('entropy-simple-brower-shortcuts: copy url ' + tab[0].url)
      copyToClipboard(tab[0].url)
    })
  } else if (command == 'searchgoogle') {
    browser.tabs.executeScript({
      code: 'window.getSelection().toString();'
    }).then(function(selection) {
      if (selection[0]) {
        let query = encodeURIComponent(selection[0])
        browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
          browser.tabs.create({url: 'https://www.google.com/search?q=' + query, index: tabs[0].index + 1})
        })
      }
    })
  } else if (command == 'movetableft') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      if (tab[0].index > 0) {
        browser.tabs.move(tab[0].id, {'index': tab[0].index - 1})
      }
    })
  } else if (command == 'movetabright') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.move(tab[0].id, {'index': tab[0].index + 1})
    })
  } else if (command == 'movetabtofirst') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      if (tab[0].index > 0) {
        chrome.tabs.move(tab[0].id, {'index': 0})
      }
    })
  } else if (command == 'movetabtolast') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.move(tab[0].id, {'index': -1})
    })
  } else if (command == 'newwindow') {
    browser.windows.create()
  } else if (command == 'newprivatewindow') {
    browser.windows.create({incognito: true})
  } else if (command == 'closewindow') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.windows.remove(tab[0].windowId)
    })
  } else if (command == 'fullscreen') {
    browser.windows.getCurrent().then(function(window) {
      var state = (window.state === 'fullscreen') ? 'normal' : 'fullscreen';
      browser.windows.update(window.id, {state: state})
    })
  } else if (command == 'zoomin') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.getZoom(tab[0].id).then(function(zoomFactor) {
        browser.tabs.setZoom(tab[0].id, zoomFactor + 0.1)
      })
    })
  } else if (command == 'zoomout') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.getZoom(tab[0].id).then(function(zoomFactor) {
        browser.tabs.setZoom(tab[0].id, zoomFactor - 0.1)
      })
    })
  } else if (command == 'zoomreset') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.setZoom(tab[0].id, 0)
    })
  } else if (command == 'back') {
    browser.tabs.executeScript(null, {'code': 'window.history.back()'})
  } else if (command == 'forward') {
    browser.tabs.executeScript(null, {'code': 'window.history.forward()'})
  } else if (command == 'reload') {
    browser.tabs.executeScript(null, {'code': 'window.location.reload()'})
  } else if (command == 'hardreload') {
    browser.tabs.reload({bypassCache: true});
  } else if (command == 'top') {
    browser.tabs.executeScript(null, {'code': 'window.scrollTo({left: 0, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'bottom') {
    browser.tabs.executeScript(null, {'code': 'window.scrollTo({left: 0, top: document.body.scrollHeight, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrollup') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: -50, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrollupmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: -500, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'pageup') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: -window.innerHeight, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrolldown') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: 50, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrolldownmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: 500, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'pagedown') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: window.innerHeight, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrollleft') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: -50, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrollleftmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: -500, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrollright') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 50, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (command == 'scrollrightmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 500, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else {
    console.log('inner_shortcut action not defined: ' + command)
    return false
  }
});
