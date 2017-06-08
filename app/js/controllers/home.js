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
      $timeout(function(){
        console.log("Scroll height:", document.documentElement.scrollHeight);
        extensionManager.setSize("content", "100%", document.documentElement.scrollHeight);
      })
    }

    $scope.showAutocomplete = function(show) {
      $scope.formData.showAutocomplete = show;

    }

    $scope.selectedTag = function(tag) {
      extensionManager.associateItem(tag);
      $scope.showAutocomplete(false);
      $scope.formData.input = "";
    }

    $scope.removeActiveTag = function(tag) {
      extensionManager.deassociateItem(tag);
    }

    extensionManager.streamItems(function(newTags) {
      console.log("New stream data:", newTags);

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

    }.bind(this))

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

    extensionManager.setSize("container", "100%", defaultHeight);
  }

}

angular.module('app').controller('HomeCtrl', HomeCtrl);
