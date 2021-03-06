describe('Distribution Plan Node Service', function () {

    var planNodeService, mockLineItemService, mockConsigneeService, mockContactService;
    var mockBackend, q;
    var planNodeEndpointUrl;

    var planNodeId = 1, lineItemOneId = 1, lineItemTwoId = 2, consigneeId = 1, contactId = 1;

    var stubPlanNode = {
        id: planNodeId,
        parent: null,
        distribution_plan: 1,
        location: 'Kampala',
        modeOfDelivery: 'Warehouse',
        contact_person_id: contactId,
        children: [2],
        distributionplanlineitem_set: [lineItemOneId, lineItemTwoId],
        consignee: consigneeId
    };

    var stubPlanNodeTwo = {
        id: planNodeId,
        parent: null,
        distribution_plan: 1,
        location: 'Kampala',
        modeOfDelivery: 'Warehouse',
        contact_person_id: contactId,
        children: [2],
        distributionplanlineitem_set: [lineItemOneId],
        consignee: consigneeId
    };

    var fullLineItemOne = {
        id: lineItemOneId,
        item: 1,
        quantity: 10,
        under_current_supply_plan: false,
        plannedDistributionDate: '2014-02-23',
        remark: 'In good condition',
        distribution_plan_node: planNodeId,
        track: true
    };

    var fullLineItemTwo = {
        id: lineItemTwoId,
        item: 2,
        quantity: 10,
        under_current_supply_plan: false,
        plannedDistributionDate: '2014-02-23',
        remark: 'In bad condition',
        distribution_plan_node: planNodeId,
        track: true
    };

    var fullConsignee = {
        id: consigneeId,
        name: 'Save the Children'
    };

    var fullContact = {
        id: contactId, firstName: 'Andrew',
        lastName: 'Mukiza', phone: '+234778945674'
    };

    var expectedPlanNode = {
        id: planNodeId,
        parent: null,
        distribution_plan: 1,
        location: 'Kampala',
        modeOfDelivery: 'Warehouse',
        children: [2],
        distributionplanlineitem_set: [lineItemOneId, lineItemTwoId],
        consignee: fullConsignee,
        contact_person_id: fullContact.id,
        contact_person: fullContact,
        lineItems: [fullLineItemOne, fullLineItemTwo]
    };

    var fakeGetLineItem = function () {
        var lineItemId = arguments[0];

        var deferredLineItemOneRequest = q.defer();
        deferredLineItemOneRequest.resolve(fullLineItemOne);

        var deferredLineItemTwoRequest = q.defer();
        deferredLineItemTwoRequest.resolve(fullLineItemTwo);

        if (lineItemId === lineItemOneId) {
            return deferredLineItemOneRequest.promise;
        }
        else if (lineItemId === lineItemTwoId) {
            return deferredLineItemTwoRequest.promise;
        }
        return null;
    };

    beforeEach(function () {
        module('DistributionPlanNode');

        mockLineItemService = jasmine.createSpyObj('mockLineItemService', ['getLineItem', 'updateLineItemField']);
        mockConsigneeService = jasmine.createSpyObj('mockConsigneeService', ['get']);
        mockContactService = jasmine.createSpyObj('mockContactService', ['get']);

        module(function ($provide) {
            $provide.value('DistributionPlanLineItemService', mockLineItemService);
            $provide.value('ConsigneeService', mockConsigneeService);
            $provide.value('ContactService', mockContactService);
        });

        inject(function (DistributionPlanNodeService, $httpBackend, EumsConfig, $q) {
            q = $q;
            mockLineItemService.getLineItem.and.callFake(fakeGetLineItem);

            var deferredConsigneeRequest = q.defer();
            deferredConsigneeRequest.resolve(fullConsignee);
            mockConsigneeService.get.and.returnValue(deferredConsigneeRequest.promise);

            var deferredContactRequest = q.defer();
            deferredContactRequest.resolve(fullContact);
            mockContactService.get.and.returnValue(deferredContactRequest.promise);

            mockBackend = $httpBackend;
            planNodeEndpointUrl = EumsConfig.BACKEND_URLS.DISTRIBUTION_PLAN_NODE;
            planNodeService = DistributionPlanNodeService;
        });
    });

    it('should create node with neither parent nor children', function (done) {
        var planId = 1, consigneeId = 1;
        var stubCreatedNode = {
            id: 1, parent: null, distribution_plan: planId, consignee: consigneeId,
            distributionplanlineitem_set: [], children: [], tree_position: 'END_USER'
        };
        mockBackend.whenPOST(planNodeEndpointUrl).respond(201, stubCreatedNode);
        planNodeService.createNode({distribution_plan: planId, consignee: consigneeId, tree_position: 'END_USER'})
            .then(function (createdNode) {
                expect(createdNode).toEqual(stubCreatedNode);
                done();
            });
        mockBackend.flush();
    });

    it('should only return a response when the status is not 201', function () {
        var planId = 1, consigneeId = 1;
        var stubCreatedNode = {id: 1, parent: null, distribution_plan: planId, consignee: consigneeId,
            distributionplanlineitem_set: [], children: [], tree_position: 'END_USER'
        };
         mockBackend.whenPOST(planNodeEndpointUrl).respond(202, stubCreatedNode);
        planNodeService.createNode({distribution_plan: planId, consignee: consigneeId, tree_position: 'END_USER'})
            .then(function (createdNode) {
                expect(createdNode.status).toEqual(202);
            });
        mockBackend.flush();
    });

    it('should get node with full details', function (done) {
        mockBackend.whenGET(planNodeEndpointUrl + planNodeId + '/').respond(stubPlanNode);
        planNodeService.getPlanNodeDetails(planNodeId).then(function (returnedPlanNode) {
            expect(returnedPlanNode).toEqual(expectedPlanNode);
            done();
        });
        mockBackend.flush();
    });

    it('should update node', function (done) {
        var updatedNode = {id: 1};
        mockBackend.whenPUT(planNodeEndpointUrl + planNodeId + '/').respond(updatedNode);
        planNodeService.updateNode(updatedNode).then(function (returnedNode) {
            expect(returnedNode).toEqual(updatedNode);
            done();
        });
        mockBackend.flush();
    });

    it('should update node tracking details', function (done) {
        var updatedNode = 1;
        var tracking = true;

        mockBackend.whenGET(planNodeEndpointUrl + planNodeId + '/').respond(stubPlanNodeTwo);
        mockLineItemService.updateLineItemField.and.returnValue(fullLineItemOne);
        planNodeService.updateNodeTracking(updatedNode, tracking).then(function (returnedLineItem) {
            expect(returnedLineItem).toEqual([fullLineItemOne]);
            done();
        });
        mockBackend.flush();
    });

    it('should get all child node line items', function (done) {
        var stubNode = {id: 42, children: [23, 76]};
        var stubChildOne = {id: 23, parent: stubNode.id, distributionplanlineitem_set: [55, 57]};
        var stubChildTwo = {id: 76, parent: stubNode.id, distributionplanlineitem_set: [98, 99]};
        var expectedChildNodeLineItems = [55, 57, 98, 99];

        mockBackend.whenGET(planNodeEndpointUrl + stubChildOne.id + '/').respond(stubChildOne);
        mockBackend.whenGET(planNodeEndpointUrl + stubChildTwo.id + '/').respond(stubChildTwo);

        planNodeService.getPlanNodeChildLineItems(stubNode).then(function (children) {
            expect(children).toEqual(expectedChildNodeLineItems);
            done();
        });
        mockBackend.flush();
    });
});

