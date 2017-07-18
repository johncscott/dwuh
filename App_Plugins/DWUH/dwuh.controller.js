function docUploadWithHistoryController($scope, $element, $compile, imageHelper, fileManager, umbRequestHelper, mediaHelper) {

    /** Clears the file collections when content is saving (if we need to clear) or after saved */
    function clearFiles() {
        //clear the files collection (we don't want to upload any!)
        fileManager.setFiles($scope.model.alias, []);
        //clear the current files
        $scope.files = [];

        if($scope.propertyForm) {
           if ($scope.propertyForm.fileCount) {
               //this is required to re-validate
               $scope.propertyForm.fileCount.$setViewValue($scope.files.length);
           }
        }

    }

    /** this method is used to initialize the data and to re-initialize it if the server value is changed */
    function initialize(index) {

        clearFiles();

        if (!index) {
            index = 1;
        }

        //this is used in order to tell the umb-single-file-upload directive to
        //rebuild the html input control (and thus clearing the selected file) since
        //that is the only way to manipulate the html for the file input control.
        $scope.rebuildInput = {
            index: index
        };
        //clear the current files
        $scope.files = [];
        //store the original value so we can restore it if the user clears and then cancels clearing.
        $scope.originalValue = $scope.model.value;

        //create the property to show the list of files currently saved
        if ($scope.model.value != "" && $scope.model.value != undefined) {

            var curDoch = $scope.model.value;
            return { file: curDoch, isImage: false };
            //$scope.persistedFiles = _.map(images, function (item) {
            //    return { file: item, isImage: imageHelper.detectIfImageByExtension(item) };
            //});
        }
        else {
            $scope.persistedFiles = [];
        }

        _.each($scope.persistedFiles, function (file) {

            var thumbnailUrl = umbRequestHelper.getApiUrl(
                        "imagesApiBaseUrl",
                        "GetBigThumbnail",
                        [{ originalImagePath: file.file }]);

            var extension = file.file.substring(file.file.lastIndexOf(".") + 1, file.file.length);

            file.extension = extension.toLowerCase();
        });

        $scope.clearFiles = false;
    }

    initialize();

    // Method required by the valPropertyValidator directive (returns true if the property editor has at least one file selected)
    $scope.validateMandatory = function () {
        return {
            isValid: !$scope.model.validation.mandatory || ((($scope.persistedFiles != null && $scope.persistedFiles.length > 0) || ($scope.files != null && $scope.files.length > 0)) && !$scope.clearFiles),
            errorMsg: "Value cannot be empty",
            errorKey: "required"
        };
    }

    //listen for clear files changes to set our model to be sent up to the server
    $scope.$watch("clearFiles", function (isCleared) {
        if (isCleared == true) {
            $scope.model.value = { clearFiles: true };
            clearFiles();
        }
        else {
            //reset to original value
            $scope.model.value = $scope.originalValue;
            //this is required to re-validate
            if($scope.propertyForm) {
               $scope.propertyForm.fileCount.$setViewValue($scope.files.length);
            }
        }
    });

    //listen for when a file is selected
    $scope.$on("filesSelected", function (event, args) {
        $scope.$apply(function () {
            //set the files collection
            fileManager.setFiles($scope.model.alias, args.files);
            //clear the current files
            $scope.files = [];
            var newVal = "";
            for (var i = 0; i < args.files.length; i++) {
                //save the file object to the scope's files collection
                $scope.files.push({ alias: $scope.model.alias, file: args.files[i] });
                newVal += args.files[i].name + ",";
            }

            //this is required to re-validate
            $scope.propertyForm.fileCount.$setViewValue($scope.files.length);

            //set clear files to false, this will reset the model too
            $scope.clearFiles = false;
            //set the model value to be the concatenation of files selected. Please see the notes
            // in the description of this controller, it states that this value isn't actually used for persistence,
            // but we need to set it so that the editor and the server can detect that it's been changed, and it is used for validation.
            $scope.model.value = { selectedFiles: newVal.trimEnd(",") };
        });
    });

    //listen for when the model value has changed
    $scope.$watch("model.value", function (newVal, oldVal) {
        //cannot just check for !newVal because it might be an empty string which we
        //want to look for.
        if (newVal !== null && newVal !== undefined && newVal !== oldVal) {
            //now we need to check if we need to re-initialize our structure which is kind of tricky
            // since we only want to do that if the server has changed the value, not if this controller
            // has changed the value. There's only 2 scenarios where we change the value internall so
            // we know what those values can be, if they are not either of them, then we'll re-initialize.

            if (newVal.clearFiles !== true && newVal !== $scope.originalValue && !newVal.selectedFiles) {
                initialize($scope.rebuildInput.index + 1);
            }

        }
    });
};
angular.module("umbraco")
    .controller('DocumentUpload.WithHistoryController', docUploadWithHistoryController)
    .run(function (mediaHelper, umbRequestHelper, assetsService) {
    	if (mediaHelper && mediaHelper.registerFileResolver) {
    		assetsService.load(["lib/moment/moment-with-locales.js"]).then(
                function () {
                	//NOTE: The 'entity' can be either a normal media entity or an "entity" returned from the entityResource
                	// they contain different data structures so if we need to query against it we need to be aware of this.
                	mediaHelper.registerFileResolver("Umbraco.UploadField", function (property, entity, thumbnail) {
                		if (thumbnail) {
                			if (mediaHelper.detectIfImageByExtension(property.value)) {
                				//get default big thumbnail from image processor
                				var thumbnailUrl = property.value + "?rnd=" + moment(entity.updateDate).format("YYYYMMDDHHmmss") + "&width=500&animationprocessmode=first";
                				return thumbnailUrl;
                			}
                			else {
                				return null;
                			}
                		}
                		else {
                			return property.value;
                		}
                	});
                }
            );
    	}
    });
