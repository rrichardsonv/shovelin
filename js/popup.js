// var debuggerClearAll = function(){
//   chrome.bookmarks.search({title:'Shovelin bookmarks'}, function(folder){
//     chrome.bookmarks.removeTree(folder[0].id, function(result){
//       console.log(result);
//     })
//   })
//   localStorage.clear();
// }

$(document).ready(function(){
  console.log('ready')
  //determine if setup is needed
  var startUpStatus = checkIfNeedSetup();
  //check for and setup as needed bookmarks and storage
  if(!startUpStatus){
    bookmarkSetup(storageCheck, storageSetup)
  }
  //check if login is needed
  if(!localStorage.Shovelin_key){
    startListenForSignup();
    showJoinForm();
  }else{
    startContributeListener();
    startShovelListener();
    showInterface();
  }
})

  // var testerLinkArray = [
  //   {
  //     digger: "Test",
  //     title: "google",
  //     url: "https://www.google.com"
  //   }
  // ];

var statusIs = function(string_msg){
  $('#status').html(string_msg);
}

var checkIfNeedSetup = function(){
  var setupScript = "<script type='text/javascript' src='../../js/setup.js'></script>"
  var l = localStorage;
  var result = false;
  var storageStatus = !!l.Shovelin_fresh && !!l.Shovelin_dry && !!l.Shovelin_key
  chrome.bookmarks.search({title:'Shovelin bookmarks'}, function(folder){
    //if bookmarks or storage are not setup
    if(!(!!folder[0] && storageStatus)){
      // $('head').append(setupScript);
    }else{
      result = true;
    }
  })
  return result;
}

var titleBookmark = function(user_name, link_title){
  return ['[',user_name,']:',link_title ].join('')
}

var processBookmarksToSend = function(){
  var processedLinks = [];
  var re = new RegExp(/\[[a-z]{4}\]\:/,'i');
  chrome.bookmarks.getChildren(localStorage.Shovelin_fresh, function(bookmarkNodes){
    for(var i = 0, j = bookmarkNodes.length; i<j; i++){
      if(!bookmarkNodes[i].title.match(re)){
        processedLinks.push(bookmarkNodes[i])

        chrome.bookmarks.update(bookmarkNodes[i].id,{title: titleBookmark(localStorage.Shovelin_name, bookmarkNodes[i].title)},function(){
          console.log('name updated');
        })
      }
    }
  });
  console.log('process bookmarks')
  chrome.bookmarks.getChildren(localStorage.Shovelin_dry, function(bookmarkNodes){
    for(var i = 0, j = bookmarkNodes.length; i<j; i++){
      if(!bookmarkNodes[i].title.match(re)){
        processedLinks.push(bookmarkNodes[i])
        //update bookmarks
        chrome.bookmarks.update(bookmarkNodes[i].id,{title: titleBookmark(localStorage.Shovelin_name, bookmarkNodes[i].title)},function(){
          console.log('name updated');
        })
      }
    }
  });
  console.log("Links processed: "+processedLinks.length);
  return processedLinks;
}

var getNextLocalLink = function(){
  //traverse to fresh folder
  console.log('getting next link')
  chrome.bookmarks.getChildren(localStorage.Shovelin_fresh, function(bookmarkNodes){
    console.log(bookmarkNodes);
    if(bookmarkNodes.length == 1){
      localStorage.Shovelin_nextId = bookmarkNodes[0].id
    }else{
      localStorage.Shovelin_nextId = bookmarkNodes[Math.floor(Math.random() * bookmarkNodes.length)].id
    }
  //randomly select one of the links and store its id in local storage
  });
}

var openNextLink = function(next_id){
  //get id from storage
  var next;
  if(!next_id){
    next = localStorage.Shovelin_nextId;
  }else{
    next = next_id
  }
  //traverse to bookmark using id
  chrome.bookmarks.get(next, function(bookmarkNode){
  //using url open new tab
    console.log(bookmarkNode)
    chrome.bookmarks.move(bookmarkNode[0].id,{parentId: localStorage.Shovelin_dry},function(result){
        console.log('moved with status:',e);
        })
    chrome.tabs.create({url: bookmarkNode[0].url});
  })
}

var addToBookmarks = function(apiLinks, f){
  var fresh = localStorage.Shovelin_fresh;
  console.log("adding to:", fresh);
  //get response obj
  for(var i = 0, j = apiLinks.length; i<j; i++){
  //make bookmarks
    chrome.bookmarks.create({
        parentId: fresh,
        title: "[" + apiLinks[i].digger + "]:" + apiLinks[i].title,
        url: apiLinks[i].url
      }, function(result){
        if(typeof f == 'function'){
          
          f(result.id);
        }else{
          console.log(result)
        }
      })
  }
}

var showInterface = function(){
    $('#mainPopup').removeClass('hidden');
    $('#loginHolder').remove();
}

//send local bookmarks to server
var startContributeListener = function(){
  console.log('listening for shipment')
  var localLinks = processBookmarksToSend();
  $('#mainPopup').on('click','#ship-button', function(e){
    e.preventDefault();
    checked = $('#current-page')[0].checked;
    
    if(checked){
      chrome.tabs.query({active: true, currentWindow: true}, function(currenTab){
        localLinks.push(currenTab[0]);
        sendLinks(localLinks);
      })
    }else{
      localLinks = processBookmarksToSend();
      sendLinks(localLinks);
    }

    // sendLinks(localLinks);
  })
};
var sendLinks = function(array_of_bookmarks){
  console.log('sending links!')
  var method = 'POST';
  var url = "http://shovelin.herokuapp.com/api/v1/links?key="+localStorage.Shovelin_key;
  var data = {links:[]};
  for(var i = 0, j = array_of_bookmarks.length; i<j;i++){
    data.links.push({url: array_of_bookmarks[i].url, 
      title: array_of_bookmarks[i].title
    })
  }
    $.ajax({
      type: method,
      url: url,
      data: JSON.stringify({bookmarks: data}),
      dataType: 'json',
      contentType: 'application/json'
    })
    .done(function(response){
      console.log('success!',response)
    })
    .fail(function(error){
      console.log('error:',error);
    })
    .always(function(){
      console.log('done')
    });
};

//pull many remote bookmarks down to local
var startBookmarkListener = function(){
  $('#mainPopup').on('click','#bookmark-button', function(e){
    getBookmarks();
  })
};
var getBookmarks = function(){
  //title of stumbling folder!
  var data = "?key="+localStorage.Shovelin_key;
  $.ajax({
    type: 'GET',
    url: "http://shovelin.herokuapp.com/api/v1/links" + data,
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded',

    success: function(response){
        addToBookmarks(response.data);
    },
    error: function(error){
        console.error(error);
        statusIs('Problem with remote links');

    }
  })
};

//pull one remote bookmark down to local and open
var startShovelListener = function(){
  $('#mainPopup').on('click', '#dig-button',function(e){
    var localOption = $('#local-only')[0].checked;
      if(localOption){
        getNextLocalLink();
      }else{
        getNextRemoteLink();
      }
        openNextLink();
        getNextLocalLink();
      // console.error('Bookmarks folders not properly setup');
    })
};
var getNextRemoteLink = function(){
  var data = "?key="+localStorage.Shovelin_key;
  $.ajax({
    type: 'GET',
    url: "http://shovelin.herokuapp.com/api/v1/links/random" + data,
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded',

    success: function(response){
        if(!response.data[0]){
          console.error(error);
          statusIs('No remote links');
          getNextLocalLink();
          openNextLink();
        }else{
          addToBookmarks(response.data,openNextLink);
        }
    },
    error: function(error){
        console.error(error);
        statusIs('No remote links');
        getNextLocalLink();
        openNextLink();
    }
  })
};




