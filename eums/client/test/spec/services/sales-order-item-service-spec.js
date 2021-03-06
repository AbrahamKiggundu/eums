describe('Sales Order Item Service', function () {

    var salesOrderItemEndpointUrl, itemEndpointUrl, itemUnitEndpointUrl,
        distributionPlanLineItemEndpointUrl, distributionPlanNodeEndpointUrl,
        consigneeEndpointUrl, poItemForSalesOrderItemEndpointUrl;
    var mockBackend;
    var salesOrderItemService;

    var salesOrderItemId = 1;
    var itemId = 1;
    var itemUnitId = 1;

    var stubSalesOrderItem = {
        id: salesOrderItemId,
        sales_order: '1',
        item: itemId,
        quantity: 100,
        net_price: 10.00,
        net_value: 1000.00,
        issue_date: '2014-10-02',
        delivery_date: '2014-10-02',
        information: {
            distributionplanlineitem_set: []
        },
        distributionplanlineitem_set: []
    };

    var stubItem = {
        id: itemId,
        description: 'item description',
        unit: 1
    };

    var stubItemUnit = {id: itemUnitId, name: 'Unit name'};

    beforeEach(function () {
        module('SalesOrderItem');

        inject(function ($httpBackend, SalesOrderItemService, EumsConfig) {
            mockBackend = $httpBackend;
            itemEndpointUrl = EumsConfig.BACKEND_URLS.ITEM;
            itemUnitEndpointUrl = EumsConfig.BACKEND_URLS.ITEM_UNIT;
            salesOrderItemService = SalesOrderItemService;
            salesOrderItemEndpointUrl = EumsConfig.BACKEND_URLS.SALES_ORDER_ITEM;
            poItemForSalesOrderItemEndpointUrl = EumsConfig.BACKEND_URLS.PO_ITEM_FOR_SO_ITEM;
            distributionPlanLineItemEndpointUrl = EumsConfig.BACKEND_URLS.DISTRIBUTION_PLAN_LINE_ITEM;
            distributionPlanNodeEndpointUrl = EumsConfig.BACKEND_URLS.DISTRIBUTION_PLAN_NODE;
            consigneeEndpointUrl = EumsConfig.BACKEND_URLS.CONSIGNEE;
        });

        mockBackend.whenGET(itemUnitEndpointUrl + itemUnitId + '/').respond(stubItemUnit);
        mockBackend.whenGET(itemEndpointUrl + itemId + '/').respond(stubItem);
        mockBackend.whenGET(salesOrderItemEndpointUrl + salesOrderItemId + '/').respond(stubSalesOrderItem);
    });

    xit('should get item details', function (done) {
        var expectedSalesOrderItem = {
            id: 1, sales_order: '1',
            item: {id: 1, description: 'item description', unit: {id: 1, name: 'Unit name'}},
            quantity: 100, net_price: 10, net_value: 1000, issue_date: '2014-10-02', delivery_date: '2014-10-02',
            information: {
                distributionplanlineitem_set: []
            },
            distributionplanlineitem_set: []
        };

        salesOrderItemService.get(salesOrderItemId).then(function (salesOrderItem) {
            expect(salesOrderItem).toEqual(expectedSalesOrderItem);
            done();
        });
        mockBackend.flush();
    });

    it('should get purchase order item details', function (done) {
        var stubPurchaseOrder = {
            id: 1,
            order_number: 1,
            sales_order: 1,
            date: '2014-10-06',
            purchaseorderitem_set: [1, 2],
            programme: 'TEST PROGRAMME'
        };

        var expectedPurchaseOrderItem = {
            id: 1,
            item_number: itemId,
            purchase_order: stubPurchaseOrder,
            sales_order_item_id: salesOrderItemId
        };

        mockBackend.whenGET(poItemForSalesOrderItemEndpointUrl + salesOrderItemId + '/').respond(expectedPurchaseOrderItem);

        salesOrderItemService.getPOItemforSOItem(salesOrderItemId).then(function (purchaseOrderItem) {
            expect(purchaseOrderItem).toEqual(expectedPurchaseOrderItem);
            done();
        });
        mockBackend.flush();
    });

    it('should provide top level distribution plan line items', function (done) {
        var stubLineItemWithParent = {id: 42, distribution_plan_node: 42};
        var stubPlanNodeWithParent = {id: 42, parent: 42};
        var stubLineItemWithoutParent = {id: 56, distribution_plan_node: 56};
        var stubPlanNodeWithoutParent = {id: 56, parent: null};
        stubSalesOrderItem.distributionplanlineitem_set = [42, 56];

        var expectedLineItemSet = [56];

        mockBackend
            .whenGET(distributionPlanLineItemEndpointUrl + stubLineItemWithParent.id + '/')
            .respond(stubLineItemWithParent);
        mockBackend
            .whenGET(distributionPlanNodeEndpointUrl + stubPlanNodeWithParent.id + '/')
            .respond(stubPlanNodeWithParent);

        mockBackend
            .whenGET(distributionPlanLineItemEndpointUrl + stubLineItemWithoutParent.id + '/')
            .respond(stubLineItemWithoutParent);
        mockBackend
            .whenGET(distributionPlanNodeEndpointUrl + stubPlanNodeWithoutParent.id + '/')
            .respond(stubPlanNodeWithoutParent);

        salesOrderItemService
            .getTopLevelDistributionPlanLineItems(stubSalesOrderItem)
            .then(function (distributionPlanLineItemSet) {
                expect(distributionPlanLineItemSet).toEqual(expectedLineItemSet);
                done();
            });
        mockBackend.flush();
    });

    it('should return top level distribution ' +
        'plan node items', function (done) {
        var stubLineItemWithParent = {id: 42, distribution_plan_node: 41};
        var stubPlanNodeWithParent = {id: 41, parent: 40, consignee: 3 };
        var stubLineItemWithoutParent = {id: 56, distribution_plan_node: 55};
        var stubPlanNodeWithoutParent = {id: 55, parent: null, consignee: 3 };
        var stubPlanNodeWithoutParentConsignee = {id: 3, name: 'Stub Consignee' };
        stubSalesOrderItem.distributionplanlineitem_set = [42, 56];

        var expectedPlanNodeSet = [{id: 55, parent: null, consignee: 3, consignee_name: 'Stub Consignee' }];

        mockBackend
            .whenGET(distributionPlanLineItemEndpointUrl + stubLineItemWithParent.id + '/')
            .respond(stubLineItemWithParent);
        mockBackend
            .whenGET(distributionPlanNodeEndpointUrl + stubPlanNodeWithParent.id + '/')
            .respond(stubPlanNodeWithParent);

        mockBackend
            .whenGET(distributionPlanLineItemEndpointUrl + stubLineItemWithoutParent.id + '/')
            .respond(stubLineItemWithoutParent);
        mockBackend
            .whenGET(distributionPlanNodeEndpointUrl + stubPlanNodeWithoutParent.id + '/')
            .respond(stubPlanNodeWithoutParent);

        mockBackend
            .whenGET(consigneeEndpointUrl + stubPlanNodeWithoutParent.consignee + '/')
            .respond(stubPlanNodeWithoutParentConsignee);

        salesOrderItemService
            .getTopLevelDistributionPlanNodes(stubSalesOrderItem)
            .then(function (distributionPlanNodeSet) {
                expect(distributionPlanNodeSet).toEqual(expectedPlanNodeSet);
                done();
            });
        mockBackend.flush();
    });
});
