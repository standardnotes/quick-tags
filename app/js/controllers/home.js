class HomeCtrl {
  constructor($rootScope, $scope, $timeout) {

    $scope.tags = [];

    var delimitter = ".";

    var permissions = [
      {
        name: "stream-items",
        content_types: ["Tag"]
      },
      {
        name: "stream-context-item"
      }
    ]

    let componentManager = new window.ComponentManager(permissions, function(){
      // on ready
    });

    $scope.formData = {};
    let defaultHeight = 50;

    $scope.tagsInputChange = function($event) {
      var input = $scope.formData.input;

      var lastTag = input.split("#").slice(-1)[0];
      if(lastTag) {
        $scope.results = $scope.tags.filter(function(tag){
          var comps = tag.content.title.split(delimitter);
          for(var comp of comps) {
            if(comp.length && comp.startsWith(lastTag)) {
              return true;
            }
          }
          return tag.content.title.startsWith(lastTag);
        }).sort(function(a, b){
          return a.content.title > b.content.title;
        })
      } else {
        $scope.results = [];
      }

      $scope.showAutocomplete($scope.results.length > 0);
      $scope.highlightTag($scope.results[0]);
    }

    $scope.showAutocomplete = function(show) {
      $scope.formData.showAutocomplete = show;

      $timeout(function(){
        componentManager.setSize("content", "100%", document.documentElement.scrollHeight);
      })
    }

    $scope.selectTag = function(tag) {
      var comps = tag.content.title.split(delimitter);
      for(var index = 1; index < comps.length + 1; index++) {
        var tagName = comps.slice(0, index).join(delimitter);
        var _tag = $scope.tags.filter(function(candidate){
          return candidate.content.title === tagName;
        })[0]

        componentManager.associateItem(_tag);
      }

      $scope.showAutocomplete(false);
      $scope.formData.input = "";
      $scope.highlightedTag = null;
    }

    $scope.removeActiveTag = function(tag) {
      componentManager.deassociateItem(tag);
    }

    componentManager.streamItems(function(newTags) {
      $timeout(function(){
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
      })

    }.bind(this));

    componentManager.streamContextItem(function(item){
      $timeout(function(){
        var tags = $scope.tags.filter(function(tag){
          var matchingReference = item.content.references.filter(function(ref){
            return ref.uuid === tag.uuid
          })[0];
          return matchingReference;
        })

        $scope.activeTags = tags.sort(function(a, b){
          return a.content.title > b.content.title;
        })
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
        componentManager.createItem({content_type: "Tag", content: {title: $scope.formData.input}});
        $scope.formData.input = "";
      }
    }

    componentManager.setSize("container", "100%", defaultHeight);

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
