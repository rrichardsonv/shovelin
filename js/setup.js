var storageCheck = function(errorF){
  var result = true;
  var storage_keys = ['fresh','dry'];
  for(var i = 0, j = storage_keys.length; i<j;i++){
    result = result && !!localStorage[['',storage_keys[i]].join('_')]
  }
  if(!result){
    if(typeof errorF == "function"){
      errorF();
    }else{
      console.error(errorF + " is not a function");
    }
  }
  
}

var storageSetup = function(){
  chrome.bookmarks.search({title:'dry'}, function(dryFolder){
      localStorage.Shovelin_dry = dryFolder[0].id
      chrome.bookmarks.search({title:'fresh'}, function(freshFolder){
        localStorage.Shovelin_fresh = freshFolder[0].id;
      })
    })
};

var bookmarkSetup = function(fOne,fTwo){
  var lStorage = localStorage;
  var result = true;
  chrome.bookmarks.search({title:'Shovelin bookmarks'}, function(folder){
    if(!folder[0]){
      //create parent folder in Other Bookmarks
      chrome.bookmarks.create({'parentId': '2',
                               'title': 'Shovelin bookmarks'},
                              function(newFolder) {
        console.log("added folder: " + newFolder.title);
        result = result && !!newFolder;
        chrome.bookmarks.create({'parentId': newFolder.id, 'title': 'fresh'}, function(subfolder){
          console.log("added subfolder: " + subfolder.title);
          lStorage.Shovelin_fresh = subfolder.id;
          console.log(lStorage.Shovelin_fresh);
          result = result && !!subfolder; 
        });
        chrome.bookmarks.create({'parentId': newFolder.id, 'title': 'dry'}, function(subfolder){
          console.log("added subfolder: " + subfolder.title);
          lStorage.Shovelin_dry = subfolder.id;
          result = result && !!subfolder; 
        });
      });
    }
  })
  if(result){
    fOne(fTwo);
  }else{
    statusIs('You should email rich something done broke');
  }
};

var showJoinForm = function(){
  var loginForm = `
  <div class="container" id="loginHolder">
    <form id="join-form">
      <input class="form-text-input" type="email" name="email" placeholder="you@email.com">
      <input class="form-text-input" type="text" name="name" placeholder="Bana">
      <input class="center-button" type="submit" value="Login/Join">
    </form>
  </div>
  `
  $('body').append(loginForm);
};

var startListenForSignup = function(){
  console.log('listening for signup')
  $('body').on('submit','#join-form', function(e){
    e.preventDefault();
    var $form = $(this);
    //store username in localstorage
    localStorage.Shovelin_name = $form[0][1].value;
    
    var data = JSON.stringify({
      email: $form[0][0].value,
      name: $form[0][1].value
    })
    var method = 'POST';
    var url = 'https://shovelin.herokuapp.com/api/v1/users'

    $.ajax({
      type: method,
      url: url,
      data: data,
      dataType: 'json',
      contentType:    'application/json'
    })
    .done(function(response){
      localStorage.Shovelin_key = response.data.key;
      startContributeListener();
      startShovelListener();
      showInterface();
    })
    .fail(function(error){
      statusIs(error);
      localStorage.clear();
    })
    .always(function(response){
      console.log(response)
    });
  })
}