describe('DistributionPlanController', function () {

    var scope, sorter, filter;
    var location, distPlanEndpointUrl;
    var mockContactService, mockPlanService, mockProgrammeService, mockSalesOrderService;
    var deferred, deferredPlan, deferredSalesOrder;

    var programmeOne = {
        id: 1, name: 'Test Programme'
    };

    var stubResponse = {
        data: {
            _id: 'xxxxxxxx',
            firstname: 'Tunji',
            lastname: 'Sunmonu',
            phone: '+256778945363'
        }
    };

    var salesOrderOne = {id: 1, 'order_number': '00001', 'date': '2014-10-02', programme: programmeOne.id, description: 'sale'};
    var salesOrderDetails = [salesOrderOne];

    var stubError = {
        data: {
            error: 'Phone number is not valid'
        }
    };

    beforeEach(function () {
        module('DistributionPlan');
        mockContactService = jasmine.createSpyObj('mockContactService', ['addContact']);
        mockPlanService = jasmine.createSpyObj('mockPlanService', ['getPlanDetails', 'getSalesOrders']);
        mockProgrammeService = jasmine.createSpyObj('mockProgrammeService', ['getProgramme', 'fetchProgrammes']);
        mockSalesOrderService = jasmine.createSpyObj('mockSalesOrderService', ['getSalesOrders']);

        inject(function ($controller, $rootScope, ContactService, $location, $q, $sorter, $filter, $httpBackend, EumsConfig) {
            deferred = $q.defer();
            deferredPlan = $q.defer();
            deferredSalesOrder = $q.defer();
            mockContactService.addContact.and.returnValue(deferred.promise);
            mockProgrammeService.getProgramme.and.returnValue(deferred.promise);
            mockProgrammeService.fetchProgrammes.and.returnValue(deferred.promise);
            mockPlanService.getSalesOrders.and.returnValue(deferredPlan.promise);
            mockPlanService.getPlanDetails.and.returnValue(deferredPlan.promise);
            mockSalesOrderService.getSalesOrders.and.returnValue(deferredSalesOrder.promise);

            location = $location;
            scope = $rootScope.$new();
            sorter = $sorter;
            filter = $filter;
            distPlanEndpointUrl = EumsConfig.BACKEND_URLS.DISTRIBUTION_PLAN;

            $controller('DistributionPlanController',
                {$scope: scope, ContactService: mockContactService,
                    DistributionPlanService: mockPlanService,
                    ProgrammeService: mockProgrammeService,
                    SalesOrderService: mockSalesOrderService,
                    $sorter: sorter,
                    $filter: filter,
                    $location: location});
        });
    });

    describe('when sorted', function () {
        it('should set the sort criteria', function () {
            scope.sortBy('field');
            expect(scope.sort.criteria).toBe('field');
        });
        it('should set the sort order as descending by default', function () {
            scope.sortBy('field');
            expect(scope.sort.descending).toBe(true);
        });
        it('should toggle the sort order', function () {
            scope.sortBy('field');
            scope.sortBy('field');
            expect(scope.sort.descending).toBe(false);
        });
    });

    describe('when initialized', function () {
        it('should set all sales orders on initialize to the scope', function () {
            deferredSalesOrder.resolve(salesOrderDetails);
            scope.initialize();
            scope.$apply();
            expect(scope.salesOrders).toEqual(salesOrderDetails);
        });

        it('should set the sorter', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sortBy).toBe(sorter);
        });

        it('should sort by order number', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sort.criteria).toBe('order_number');
        });

        it('should sort in descending order', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sort.descending).toBe(false);
        });

        it('should have the sort arrow icon on the order number column by default', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sortArrowClass('')).toEqual('');
        });

        it('should set the clicked column as active', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sortArrowClass('order_number')).toEqual('active glyphicon glyphicon-arrow-down');
        });

        it('should set the clicked column as active and have the up arrow when ascending', function () {
            scope.initialize();
            scope.sort.descending = true;
            scope.$apply();
            expect(scope.sortArrowClass('order_number')).toEqual('active glyphicon glyphicon-arrow-up');
        });

    });

    describe('when sales order is selected', function () {
        it('should change location to create distribution plan path', function () {
            deferredSalesOrder.resolve(salesOrderOne);
            scope.selectSalesOrder(salesOrderOne);
            scope.$apply();
            expect(location.path()).toEqual('/delivery-report/new/1');
        });
    });

    it('should save contact and return contact with an id', function () {
        deferred.resolve(stubResponse);
        scope.addContact();
        scope.$apply();
        expect(location.path()).toEqual('/');
    });

    it('should add an error message to the scope when the contact is NOT saved', function () {
        deferred.reject(stubError);
        scope.addContact();
        scope.$apply();
        expect(scope.errorMessage).toBe('Phone number is not valid');
    });
});