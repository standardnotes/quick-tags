class HomeCtrl {
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
