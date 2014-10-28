describe('Route Provider', function () {
    var routes;

    beforeEach(function () {
        module('eums');

        inject(function ($route) {
            routes = $route;

        });
    });

    it('should have a home route', function () {
        expect((Object.keys(routes.routes))).toContain('/');
        expect(routes.routes['/'].controller).toBe('HomeController');
        expect(routes.routes['/'].templateUrl).toBe('/static/app/views/home.html');
    });

    it('should know distribution plan route exists', function () {
        expect((Object.keys(routes.routes))).toContain('/delivery-reports');
        expect(routes.routes['/delivery-reports'].controller).toBe('DistributionPlanController');
        expect(routes.routes['/delivery-reports'].templateUrl).toBe('/static/app/views/distribution-planning/distribution-planning.html');
    });

    it('should know new distribution plan route exists', function () {
        expect((Object.keys(routes.routes))).toContain('/delivery-report/new/:salesOrderId');
        expect(routes.routes['/delivery-report/new/:salesOrderId'].controller).toBe('NewDistributionPlanController');
        expect(routes.routes['/delivery-report/new/:salesOrderId'].templateUrl).toBe('/static/app/views/distribution-planning/new.html');
    });

    it('should know proceed distribution plan route exists', function () {
        expect((Object.keys(routes.routes))).toContain('/delivery-report/proceed/');
        expect(routes.routes['/delivery-report/proceed/'].controller).toBe('NewDistributionPlanController');
        expect(routes.routes['/delivery-report/proceed/'].templateUrl).toBe('/static/app/views/distribution-planning/select-items.html');
    });

    it('should know distribution reporting route exists', function () {
        expect((Object.keys(routes.routes))).toContain('/spot-check-reports');
        expect(routes.routes['/spot-check-reports'].controller).toBe('ManualReportingController');
        expect(routes.routes['/spot-check-reports'].templateUrl).toBe('/static/app/views/distribution-reporting/distribution-reporting.html');
    });

    it('should know distribution reporting details route exists', function () {
        expect((Object.keys(routes.routes))).toContain('/spot-check-report/details');
        expect(routes.routes['/spot-check-report/details'].controller).toBe('ManualReportingController');
        expect(routes.routes['/spot-check-report/details'].templateUrl).toBe('/static/app/views/distribution-reporting/details.html');
    });

});