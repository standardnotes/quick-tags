'use strict';

angular.module('app', [

])
;class HomeCtrl {
  constructor($rootScope, $scope, $timeout, extensionManager) {

    $scope.formData = {};
    let defaultHeight = 45;

    $scope.tagsInputChange = function($event) {
      var input = $scope.formData.input;
      var lastTag = input.split("#").slice(-1)[0];

      $scope.results = $scope.tags.filter(function(tag){
        return lastTag.length && tag.content.title.startsWith(lastTag);
      }).sort(function(a, b){
        return a.content.title > b.content.title;
      })

      $scope.showAutocomplete($scope.results.length > 0);
      $scope.highlightTag($scope.results[0]);

      $timeout(function(){
        extensionManager.setSize("content", "100%", document.documentElement.scrollHeight);
      })
    }

    $scope.showAutocomplete = function(show) {
      $scope.formData.showAutocomplete = show;

    }

    $scope.selectTag = function(tag) {
      extensionManager.associateItem(tag);
      $scope.showAutocomplete(false);
      $scope.formData.input = "";
      $scope.highlightedTag = null;
    }

    $scope.removeActiveTag = function(tag) {
      extensionManager.deassociateItem(tag);
    }

    extensionManager.streamItems(function(newTags) {

      var allTags = $scope.tags || [];
      for(var tag of newTags) {
        var existing = allTags.filter(function(tagCandidate){
          return tagCandidate.uuid === tag.uuid;
        })[0];
        if(existing) {
          Object.assign(existing, tag);
        } else {
          allTags.push(tag);
        }
      }

      $scope.tags = allTags;

    }.bind(this));

    extensionManager.streamReferences(function(tagReferences){
      var tags = $scope.tags.filter(function(tag){
        var matchingReference = tagReferences.filter(function(ref){
          return ref.uuid === tag.uuid
        })[0];
        return matchingReference;
      })

      $scope.activeTags = tags.sort(function(a, b){
        return a.content.title > b.content.title;
      })
    })

    $scope.highlightTag = function(tag) {
      $scope.highlightedTag = tag;
    }

    $scope.highlightNextResult = function() {
      if(!$scope.results) {
        return;
      }
      var index = $scope.results.indexOf($scope.highlightedTag);
      $scope.highlighResultAtIndex(index + 1);
    }

    $scope.highlightPreviousResult = function() {
      if(!$scope.results) {
        return;
      }
      var index = $scope.results.indexOf($scope.highlightedTag);
      index--;
      if(index < 0) {
        index = $scope.results.length - 1;
      }
      $scope.highlighResultAtIndex(index);
    }

    $scope.highlighResultAtIndex = function(index) {
      $scope.highlightTag($scope.results[index % $scope.results.length]);
    }

    $scope.onEnter = function() {
      if($scope.highlightedTag) {
        $scope.selectTag($scope.highlightedTag);
      } else if($scope.formData.input) {
        extensionManager.createItem({content_type: "Tag", content: {title: $scope.formData.input}});
        $scope.formData.input = "";
      }
    }

    extensionManager.setSize("container", "100%", defaultHeight);

    document.onkeydown = handleArrowKey;

    function handleArrowKey(e) {
        e = e || window.event;
        if (e.keyCode == '38') {
          // up arrow
          $timeout(function(){
            $scope.highlightPreviousResult();
          })
        } else if (e.keyCode == '40') {
          // down arrow
          $timeout(function(){
            $scope.highlightNextResult();
          });
        }
    }

  }
}

// required for firefox
HomeCtrl.$$ngIsClass = true;

angular.module('app').controller('HomeCtrl', HomeCtrl);
;class ExtensionManager {

  constructor($timeout) {
    this.sentMessages = [];
    this.messageQueue = [];
    this.timeout = $timeout;

    window.addEventListener("message", function(event){
      console.log("Autocomplete tags: message received", event.data);
      this.handleMessage(event.data);
    }.bind(this), false);
  }

  handleMessage(payload) {
    if(payload.action === "component-registered") {
      this.sessionKey = payload.sessionKey;
      this.onReady();
    }

    else if(payload.original) {
      // get callback from queue
      var originalMessage = this.sentMessages.filter(function(message){
        return message.messageId === payload.original.messageId;
      })[0];

      if(originalMessage.callback) {
        originalMessage.callback(payload.data);
      }
    }
  }

  onReady() {
    for(var message of this.messageQueue) {
      this.postMessage(message.action, message.data, message.callback);
    }
    this.messageQueue = [];
  }

  postMessage(action, data, callback) {
    if(!this.sessionKey) {
      this.messageQueue.push({
        action: action,
        data: data,
        callback: callback
      });
      return;
    }

    var message = {
      action: action,
      data: data,
      messageId: this.generateUUID(),
      sessionKey: this.sessionKey,
      api: "component"
    }

    var sentMessage = JSON.parse(JSON.stringify(message));
    sentMessage.callback = callback;
    this.sentMessages.push(sentMessage);

    window.parent.postMessage(message, '*');
  }

  setSize(type, width, height) {
    this.postMessage("set-size", {type: type, width: width, height: height}, function(data){

    })
  }

  streamItems(callback) {
    this.postMessage("stream-items", {content_types: ["Tag"]}, function(data){
      var tags = data.items;
      this.timeout(function(){
        callback(tags);
      })
    }.bind(this));
  }

  streamReferences(callback) {
    this.postMessage("stream-references", {}, function(data){
      var references = data.references;
      var tagRefs = references.filter(function(ref){
        return ref.content_type === "Tag";
      })
      this.timeout(function(){
        callback(tagRefs);
      })
    }.bind(this));
  }

  selectItem(item) {
    this.postMessage("select-item", {item: this.jsonObjectForItem(item)});
  }

  createItem(item) {
    this.postMessage("create-item", {item: this.jsonObjectForItem(item)}, function(data){
      var item = data.item;
      this.associateItem(item);
    }.bind(this));
  }

  associateItem(item) {
    this.postMessage("associate-item", {item: this.jsonObjectForItem(item)});
  }

  deassociateItem(item) {
    this.postMessage("deassociate-item", {item: this.jsonObjectForItem(item)});
  }

  clearSelection() {
    this.postMessage("clear-selection", {content_type: "Tag"});
  }

  saveItem(item) {
    this.saveItems[item];
  }

  saveItems(items) {
    items = items.map(function(item) {
      return this.jsonObjectForItem(item);
    }.bind(this));

    this.postMessage("save-items", {items: items}, function(data){

    });
  }

  jsonObjectForItem(item) {
    var copy = Object.assign({}, item);
    copy.children = null;
    copy.parent = null;
    return copy;
  }

  generateUUID() {
    var crypto = window.crypto || window.msCrypto;
    if(crypto) {
      var buf = new Uint32Array(4);
      crypto.getRandomValues(buf);
      var idx = -1;
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          idx++;
          var r = (buf[idx>>3] >> ((idx%8)*4))&15;
          var v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
    } else {
      var d = new Date().getTime();
      if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
      }
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
      return uuid;
    }
  }

}

angular.module('app').service('extensionManager', ExtensionManager);
