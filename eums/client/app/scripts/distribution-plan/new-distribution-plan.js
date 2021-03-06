'use strict';

angular.module('NewDistributionPlan', ['DistributionPlan', 'ngTable', 'siTable', 'SalesOrderItem', 'DistributionPlanNode', 'ui.bootstrap', 'Consignee', 'SalesOrder', 'PurchaseOrder', 'PurchaseOrderItem', 'eums.ip', 'ngToast', 'Contact', 'User'])
    .controller('NewDistributionPlanController', function ($scope, $location, $q, $routeParams, DistributionPlanLineItemService, DistributionPlanService, DistributionPlanNodeService, ConsigneeService, SalesOrderService, PurchaseOrderService, PurchaseOrderItemService, SalesOrderItemService, IPService, UserService, ngToast, ContactService) {
        $scope.datepicker = {};
        $scope.districts = [];
        $scope.consignee_button_text = 'Add Consignee';
        $scope.contact = {};
        $scope.lineItem = {};
        $scope.itemIndex = '';
        $scope.track = false;
        $scope.consigneeLevel = false;
        $scope.isReport = false;

        $scope.distributionPlanReport = $location.path().substr(1, 15) !== 'delivery-report';
        $scope.quantityHeaderText = $scope.distributionPlanReport ? 'Targeted Qty' : 'Delivered Qty';
        $scope.deliveryDateHeaderText = $scope.distributionPlanReport ? 'Delivery Date' : 'Date Delivered';

        function createToast(message, klass) {
            ngToast.create({
                content: message,
                class: klass,
                maxNumber: 1,
                dismissOnTimeout: true
            });
        }

        function showLoadingModal(show){
            if (show && !angular.element('#loading').hasClass('in')){
                angular.element('#loading').modal();
            }
            else if (!show){
                 angular.element('#loading').modal('hide');
                 angular.element('#loading.modal').removeClass('in');
            }
        }

        function getUser(){
            if(!$scope.user){
                return UserService.getCurrentUser().then(function (user) {
                    return user;
                });
            }
            else{
                var deferred = $q.defer();
                deferred.resolve($scope.user);
                return deferred.promise;
            }
        }

        $scope.addContact = function (itemIndex, lineItem) {
            $scope.$parent.itemIndex = itemIndex;
            $scope.$parent.lineItem = lineItem;
            $('#add-contact-modal').modal();
        };

        $scope.addRemark = function (itemIndex, lineItem) {
            $scope.$parent.itemIndex = itemIndex;
            $scope.$parent.lineItem = lineItem;
            $('#add-remark-modal').modal();
        };

        $scope.saveContact = function () {
            ContactService
                .create($scope.contact)
                .then(function (response) {
                    $('#add-contact-modal').modal('hide');

                    var contact = response.data;
                    var contactInput = $('#contact-select-' + $scope.itemIndex);
                    var contactSelect2Input = contactInput.siblings('div').find('a span.select2-chosen');
                    contactSelect2Input.text(contact.firstName + ' ' + contact.lastName);

                    contactInput.val(contact._id);
                    $scope.lineItem.contactPerson = contact._id;

                    $scope.contact = {};
                }, function (response) {
                    createToast(response.data.error, 'danger');
                });
        };

        $scope.invalidContact = function (contact) {
            return !(contact.firstName && contact.lastName && contact.phone);
        };

        showLoadingModal(true);

        IPService.loadAllDistricts().then(function (response) {
            $scope.districts = response.data.map(function (district) {
                return {id: district, name: district};
            });
        });

        ConsigneeService.all().then(function (consignees) {
            $scope.consignees = consignees;
        });

        $scope.distributionPlanLineItems = [];
        $scope.salesOrderItems = [];

        if ($scope.distributionPlanReport) {
            SalesOrderService.get($routeParams.salesOrderId, ['programme']).then(function (response) {
                $scope.selectedSalesOrder = response;

                var salesOrderItemSetPromises = [];
                $scope.selectedSalesOrder.salesorderitem_set.forEach(function (salesOrderItem) {
                    salesOrderItemSetPromises.push(
                        SalesOrderItemService.get(salesOrderItem).then(function (result) {
                        var formattedSalesOrderItem = {
                            display: result.item.description,
                            materialCode: result.item.material_code,
                            quantity: result.quantity,
                            unit: result.item.unit.name,
                            information: result
                        };
                        formattedSalesOrderItem.quantityLeft = computeQuantityLeft(formattedSalesOrderItem);

                        if (formattedSalesOrderItem.information.id === Number($routeParams.salesOrderItemId) && !$routeParams.distributionPlanNodeId) {
                            $scope.selectedSalesOrderItem = formattedSalesOrderItem;
                            $scope.selectSalesOrderItem();
                        }

                        $scope.salesOrderItems.push(formattedSalesOrderItem);
                    }));
                });

                $q.all(salesOrderItemSetPromises).then( function(){
                    if (!$routeParams.salesOrderItemId){
                        showLoadingModal(false);
                    }
                });
            });
        }
        else {
            $scope.isReport = true;
            getUser().then(function (user){
                $scope.user = user;
                if ($scope.user.consignee_id) {
                    PurchaseOrderService.getConsigneePurchaseOrder($routeParams.purchaseOrderId, $scope.user.consignee_id).then(function (response) {
                        $scope.selectedPurchaseOrder = response;
                        $scope.selectedSalesOrder = $scope.selectedPurchaseOrder.sales_order;

                        var purchaseOrderItemSetPromises = [];
                        $scope.selectedPurchaseOrder.purchaseorderitem_set.forEach(function (purchaseOrderItem) {
                            purchaseOrderItemSetPromises.push(
                                PurchaseOrderItemService.get(purchaseOrderItem).then(function (result) {
                                var formattedSalesOrderItem = {
                                    display: result.sales_order_item.item.description,
                                    materialCode: result.sales_order_item.item.material_code,
                                    quantity: $scope.selectedSalesOrderItem ? $scope.selectedSalesOrderItem.quantity : result.sales_order_item.quantity,
                                    unit: result.sales_order_item.item.unit.name,
                                    information: result.sales_order_item
                                };
                                formattedSalesOrderItem.quantityLeft = $scope.selectedSalesOrderItem ? computeQuantityLeft($scope.selectedSalesOrderItem) : computeQuantityLeft(formattedSalesOrderItem);

                                if (formattedSalesOrderItem.information.id === Number($routeParams.salesOrderItemId)) {
                                    $scope.selectedSalesOrderItem = formattedSalesOrderItem;
                                    if (!$routeParams.distributionPlanNodeId) {
                                        $scope.selectSalesOrderItem();
                                    }
                                }

                                $scope.salesOrderItems.push(formattedSalesOrderItem);
                            }));
                        });

                        $q.all(purchaseOrderItemSetPromises).then( function(){
                            if (!$routeParams.salesOrderItemId){
                                showLoadingModal(false);
                            }
                        });
                    });
                }
                else {
                    PurchaseOrderService.getPurchaseOrder($routeParams.purchaseOrderId).then(function (response) {
                        $scope.selectedPurchaseOrder = response;
                        $scope.selectedSalesOrder = $scope.selectedPurchaseOrder.sales_order;

                        var purchaseOrderItemSetPromises = [];
                        $scope.selectedPurchaseOrder.purchaseorderitem_set.forEach(function (purchaseOrderItem) {
                            purchaseOrderItemSetPromises.push(PurchaseOrderItemService.get(purchaseOrderItem).then(function (result) {
                                var formattedSalesOrderItem = {
                                    display: result.sales_order_item.item.description,
                                    materialCode: result.sales_order_item.item.material_code,
                                    quantity: result.quantity ? result.quantity : result.sales_order_item.quantity,
                                    unit: result.sales_order_item.item.unit.name,
                                    information: result.sales_order_item
                                };
                                formattedSalesOrderItem.quantityLeft = computeQuantityLeft(formattedSalesOrderItem);

                                if (formattedSalesOrderItem.information.id === Number($routeParams.salesOrderItemId) && !$routeParams.distributionPlanNodeId) {
                                    $scope.selectedSalesOrderItem = formattedSalesOrderItem;
                                    $scope.selectSalesOrderItem();
                                }

                                $scope.salesOrderItems.push(formattedSalesOrderItem);
                            }));
                        });

                        $q.all(purchaseOrderItemSetPromises).then( function(){
                            if (!$routeParams.salesOrderItemId){
                                showLoadingModal(false);
                            }
                        });
                    });
                }
            });
        }

        if ($routeParams.distributionPlanNodeId) {
            $scope.consignee_button_text = 'Add Sub-Consignee';

            DistributionPlanNodeService.getPlanNodeDetails($routeParams.distributionPlanNodeId).then(function (planNode) {
                $scope.planNode = planNode;

                getUser().then(function (user){
                    $scope.user = user;
                    if ($scope.user.consignee_id) {
                        $scope.consigneeLevel = $scope.planNode.parent ? false : true;
                    }

                    $scope.distributionPlan = planNode.distribution_plan;
                    var nodeLineItemId = $scope.planNode.distributionplanlineitem_set[0];

                    DistributionPlanLineItemService.getLineItem(nodeLineItemId).then(function (lineItem) {
                        $scope.track = lineItem.track;

                        SalesOrderItemService.get($routeParams.salesOrderItemId).then(function (result) {
                            $scope.selectedSalesOrderItem = {
                                display: result.item.description,
                                materialCode: result.item.material_code,
                                quantity: lineItem.targeted_quantity,
                                unit: result.item.unit.name,
                                information: result
                            };
                            $scope.selectedSalesOrderItem.quantityLeft = computeQuantityLeft($scope.selectedSalesOrderItem);

                            DistributionPlanNodeService.getPlanNodeChildLineItems($scope.planNode).then(function (childLineItems) {
                                setDistributionPlanLineItems($scope.selectedSalesOrderItem, childLineItems);
                            });
                        });
                    });
                });
            });
        }

        $scope.selectSalesOrderItem = function () {
            $scope.track = false;
            $scope.invalidLineItems = NaN;
            $scope.distributionPlan = NaN;

            showLoadingModal(true);

            getUser().then(function (user){
                $scope.user = user;
                if ($scope.user.consignee_id) {
                    PurchaseOrderService.getConsigneePurchaseOrderNode($scope.user.consignee_id, $scope.selectedSalesOrderItem.information.id).then(function (response) {
                        var node = response;
                        var locPath = $location.path().split('/')[1];
                        var documentId = $scope.distributionPlanReport ? $scope.selectedSalesOrder.id : $scope.selectedPurchaseOrder.id;
                        $location.path(
                                '/' + locPath + '/new/' +
                                documentId + '-' +
                                $scope.selectedSalesOrderItem.information.id + '-' +
                                node
                        );
                    });
                }
                else {
                    $scope.distributionPlanLineItems = [];

                    var selectedSalesOrderItem = $scope.selectedSalesOrderItem;
                    SalesOrderItemService
                        .get(selectedSalesOrderItem.information.id)
                        .then(function (salesOrderItem) {
                            SalesOrderItemService
                                .getTopLevelDistributionPlanLineItems(salesOrderItem)
                                .then(function (topLevelLineItems) {
                                    setDistributionPlanLineItems(selectedSalesOrderItem, topLevelLineItems);
                                });
                        });
                }
            });
        };

        function savePlanTracking(){
            if($scope.track && $scope.distributionPlan && (!$scope.planNode || $scope.consigneeLevel)){
                DistributionPlanService.updatePlanTracking($scope.distributionPlan, $scope.track);
            }
        }

        $scope.trackSalesOrderItem = function () {
            $scope.invalidLineItems = anyInvalidFields($scope.distributionPlanLineItems);
            savePlanTracking();
        };

        var addNodeDetailsToLineItem = function (lineItem, node) {
            lineItem.consignee = node.consignee.id;
            lineItem.nodeId = node.id;
            lineItem.nodeChildren = node.children;
            lineItem.contactPerson = node.contact_person_id;
            lineItem.modeOfDelivery = node.mode_of_delivery;
            lineItem.destinationLocation = node.location;
            lineItem.track = $scope.track;
            lineItem.forEndUser = node.tree_position === 'END_USER';
        };

        var formatDateForSave = function (date) {
            return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
        };

        var formatDateForDisplay = function (date) {
            return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        };

        var setDistributionPlanLineItems = function (selectedSalesOrderItem, distributionPlanLineItems) {
            if (distributionPlanLineItems && distributionPlanLineItems.length) {
                var itemCounter = 0;
                var quantityLeft = parseInt(selectedSalesOrderItem.quantity);
                //TODO Clean this up. Get fully populated objects from endpoint
                var lineItemPromises = [];
                var planNodePromises = [];
                var lineItems = [];
                distributionPlanLineItems.forEach(function (lineItemId) {
                    lineItemPromises.push(
                        DistributionPlanLineItemService
                        .getLineItem(lineItemId)
                        .then(function (lineItem) {
                            lineItem.quantity = quantityLeft.toString();
                            lineItem.targetQuantity = lineItem.targeted_quantity;
                            lineItem.lineItemId = lineItem.id;
                            lineItem.item = $scope.selectedSalesOrderItem.information.id;
                            lineItem.flowTriggered = lineItem.flow_triggered ? true : false;

                            if (lineItem.track) {
                                $scope.track = true;
                            }

                            var date = new Date(lineItem.planned_distribution_date);
                            lineItem.plannedDistributionDate = formatDateForDisplay(date);

                            planNodePromises.push(DistributionPlanNodeService
                                .getPlanNodeDetails(lineItem.distribution_plan_node)
                                .then(function (node) {
                                    addNodeDetailsToLineItem(lineItem, node);
                                    lineItems.push(lineItem);

                                    $scope.distributionPlan = node.distribution_plan;
                                })
                            );
                            quantityLeft = quantityLeft - parseInt(lineItem.targetQuantity);
                            itemCounter++;
                            $scope.selectedSalesOrderItem.quantityLeft = quantityLeft.toString();
                        })
                    );
                });
                $q.all(lineItemPromises).then(function () {
                    $q.all(planNodePromises).then(function () {
                        $scope.distributionPlanLineItems = lineItems;
                        showLoadingModal(false);
                    });
                });
            }
            else {
                $scope.distributionPlanLineItems = [];
                showLoadingModal(false);
            }
            setDatePickers();
        };

        $scope.addDistributionPlanItem = function () {
            var distributionPlanLineItem = {
                item: $scope.selectedSalesOrderItem.information.id,
                plannedDistributionDate: '',
                targetQuantity: 0,
                destinationLocation: '',
                contactPerson: '',
                modeOfDelivery: '',
                remark: '',
                track: false,
                forEndUser: false,
                flowTriggered: false
            };

            $scope.distributionPlanLineItems.push(distributionPlanLineItem);

            setDatePickers();
        };

        function computeQuantityLeft(salesOrderItem) {
            var reduced = $scope.distributionPlanLineItems.reduce(function (previous, current) {
                return {targetQuantity: isNaN(current.targetQuantity) ?  previous.targetQuantity : (previous.targetQuantity + current.targetQuantity)};
            }, {targetQuantity: 0});

            return salesOrderItem.quantity - reduced.targetQuantity;
        }

        function invalidFields(item) {
            return item.targetQuantity <= 0 || isNaN(item.targetQuantity) || !item.consignee || !item.destinationLocation || !item.contactPerson || !item.plannedDistributionDate;
        }

        function anyInvalidFields(lineItems) {
            var itemsWithInvalidFields = lineItems.filter(function (item) {
                return $scope.selectedSalesOrderItem.quantityLeft < 0 || invalidFields(item);
            });
            return itemsWithInvalidFields.length > 0;
        }

        $scope.$watch('distributionPlanLineItems', function (newPlanItems) {
            if(isNaN($scope.invalidLineItems) && $scope.distributionPlanLineItems.length){
                $scope.invalidLineItems = true;
                return;
            }

            if (newPlanItems.length) {
                $scope.selectedSalesOrderItem.quantityLeft = computeQuantityLeft($scope.selectedSalesOrderItem);
                $scope.invalidLineItems = anyInvalidFields(newPlanItems);
            }
        }, true);

        function setDatePickers() {
            $scope.datepicker = {};
            $scope.distributionPlanLineItems.forEach(function (item, index) {
                $scope.datepicker[index] = false;
            });
        }

        function parentNodeId() {
            if (!!$scope.planNode) {
                return $scope.planNode.id;
            }
            return null;
        }

        function saveNode(uiPlanItem) {
            var nodeId = uiPlanItem.nodeId;
            var node = {
                consignee: uiPlanItem.consignee,
                location: uiPlanItem.destinationLocation,
                contact_person_id: uiPlanItem.contactPerson,
                distribution_plan: $scope.distributionPlan,
                tree_position: uiPlanItem.forEndUser ? 'END_USER' : (parentNodeId() === null ? 'IMPLEMENTING_PARTNER' : 'MIDDLE_MAN'),
                mode_of_delivery: uiPlanItem.modeOfDelivery ? uiPlanItem.modeOfDelivery : 'WAREHOUSE',
                parent: parentNodeId()
            };

            if (nodeId) {
                node.id = nodeId;
                node.children = uiPlanItem.nodeChildren ? uiPlanItem.nodeChildren : [];
                return DistributionPlanNodeService.updateNode(node);
            }
            else {
                return DistributionPlanNodeService.createNode(node);
            }
        }

        function saveLineItem(nodeLineItem, nodeId) {
            var lineItemId = nodeLineItem.lineItemId;
            var plannedDate = new Date(nodeLineItem.plannedDistributionDate);

            if (plannedDate.toString() === 'Invalid Date') {
                var planDate = nodeLineItem.plannedDistributionDate.split('/');
                plannedDate = new Date(planDate[2], planDate[1] - 1, planDate[0]);
            }

            getUser().then(function (user){
                var lineItem = {
                    item: nodeLineItem.item,
                    targeted_quantity: nodeLineItem.targetQuantity,
                    distribution_plan_node: nodeId,
                    planned_distribution_date: formatDateForSave(plannedDate),
                    remark: nodeLineItem.remark,
                    track: user.consignee_id ? true : $scope.track
                };

                if (lineItemId) {
                    lineItem.id = lineItemId;
                    return DistributionPlanLineItemService.updateLineItem(lineItem);
                }
                else {
                    return DistributionPlanLineItemService.createLineItem(lineItem).then(function (createdLineItem) {
                        nodeLineItem.lineItemId = createdLineItem.id;
                    });
                }
            });
        }

        function saveDistributionPlanLineItems() {
            var savePlanItemPromises = [];
            $scope.distributionPlanLineItems.forEach(function (item) {
                saveNode(item).then(function (createdNode) {
                    item.nodeId = createdNode.id;
                    savePlanItemPromises.push(saveLineItem(item, createdNode.id));
                });
            });
            var squashedSavePlanItemPromises = $q.all(savePlanItemPromises);
            $scope.savePlanPromise = squashedSavePlanItemPromises;
            return squashedSavePlanItemPromises;
        }

        $scope.saveDistributionPlanLineItems = function () {
            var message  = $scope.distributionPlanReport ? 'Plan Saved!' : 'Report Saved!';
            var saveWithToast = function () {
                saveDistributionPlanLineItems().then(function () {
                    createToast(message, 'success');
                });
            };

            if ($scope.distributionPlan) {
                saveWithToast();
            }
            else {
                DistributionPlanService
                    .createPlan({programme: $scope.selectedSalesOrder.programme.id})
                    .then(function (createdPlan) {
                        $scope.distributionPlan = createdPlan.id;
                        saveWithToast();
                    });
            }
        };

        $scope.addSubConsignee = function (lineItem) {
            var locPath = $location.path().split('/')[1];
            var documentId = $scope.distributionPlanReport ? $scope.selectedSalesOrder.id : $scope.selectedPurchaseOrder.id;
            $location.path(
                    '/' + locPath + '/new/' +
                    documentId + '-' +
                    $scope.selectedSalesOrderItem.information.id + '-' +
                    lineItem.nodeId
            );
        };

        $scope.showSubConsigneeButton = function (item) {
            return item.lineItemId && !item.forEndUser;
        };

        $scope.previousConsignee = function (planNode) {
            var locPath = $location.path().split('/')[1];
            var documentId = $scope.distributionPlanReport ? $scope.selectedSalesOrder.id : $scope.selectedPurchaseOrder.id;
            if (planNode.parent) {
                $location.path(
                        '/' + locPath + '/new/' +
                        documentId + '-' +
                        $scope.selectedSalesOrderItem.information.id + '-' +
                        planNode.parent
                );
            }
            else {
                $location.path(
                        '/' + locPath + '/new/' +
                        documentId + '-' +
                        $scope.selectedSalesOrderItem.information.id
                );
            }
        };
    }).directive('searchContacts', function (ContactService, $timeout) {
        function formatResponse(data) {
            return data.map(function (contact) {
                return {
                    id: contact._id,
                    text: contact.firstName + ' ' + contact.lastName
                };
            });
        }

        return {
            restrict: 'A',
            scope: true,
            require: 'ngModel',
            link: function (scope, element, _, ngModel) {

                element.select2({
                    minimumInputLength: 1,
                    width: '150px',
                    query: function (query) {
                        var data = {results: []};
                        ContactService.filter(query.term).then(function (foundContacts) {
                            data.results = formatResponse(foundContacts);
                            query.callback(data);
                        });
                    },
                    initSelection: function (element, callback) {
                        $timeout(function () {
                            var modelValue = ngModel.$modelValue;
                            if (modelValue) {
                                ContactService.get(modelValue).then(function (contact) {
                                    if (contact._id) {
                                        callback({
                                            id: contact._id,
                                            text: contact.firstName + ' ' + contact.lastName
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                element.change(function () {
                    ngModel.$setViewValue(element.select2('data').id);
                    scope.$apply();
                });
            }
        };
    })
    .directive('searchFromList', function ($timeout) {
        return {
            restrict: 'A',
            scope: false,
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                var list = JSON.parse(attrs.list);

                element.select2({
                    width: '100%',
                    query: function (query) {
                        var data = {results: []};
                        var matches = list.filter(function (item) {
                            return item.name.toLowerCase().indexOf(query.term.toLowerCase()) >= 0;
                        });
                        data.results = matches.map(function (match) {
                            return {
                                id: match.id,
                                text: match.name
                            };
                        });
                        query.callback(data);
                    },
                    initSelection: function (element, callback) {
                        $timeout(function () {
                            var matchingItem = list.filter(function (item) {
                                return item.id === ngModel.$modelValue;
                            })[0];
                            if (matchingItem) {
                                callback({id: matchingItem.id, text: matchingItem.name});
                            }
                        });
                    }
                });

                element.change(function () {
                    ngModel.$setViewValue(element.select2('data').id);
                    scope.$apply();
                });
            }
        };
    })
    .directive('onlyDigits', function () {
        return {
            require: 'ngModel',
            restrict: 'A',
            link: function (scope, element, attr, ngModelCtrl) {
                function inputValue(val) {
                    if (val) {
                        var digits = val.toString().replace(/[^0-9]/g, '');

                        if (digits.toString() !== val.toString()) {
                            ngModelCtrl.$setViewValue(digits);
                            ngModelCtrl.$render();
                        }
                        return parseInt(digits, 10);
                    }
                    return undefined;
                }

                ngModelCtrl.$parsers.push(inputValue);
            }
        };
    });