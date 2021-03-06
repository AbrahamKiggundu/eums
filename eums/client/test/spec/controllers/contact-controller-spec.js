describe('ContactController', function () {
    var scope, deferred, sorter, stubContactPromise, stubContactsPromise, toastPromise, mockContactService, mockToastProvider;

    var stubNewContact = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+234778922674'
    };

    var stubContact = {
        _id: 3,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+234778922674'
    };

    var stubContacts = [
        {
            _id: 1,
            firstName: 'Andrew',
            lastName: 'Mukiza',
            phone: '+234778945674'
        },
        {
            _id: 2,
            firstName: 'James',
            lastName: 'Oloo',
            phone: '+234778945675'
        }
    ];

    beforeEach(module('Contact'));

    beforeEach(function () {
        module('ngTable');
        module('siTable');

        mockContactService = jasmine.createSpyObj('mockContactService',
            ['all',
                'create',
                'update',
                'del']);

        mockToastProvider = jasmine.createSpyObj('mockToastProvider', ['create']);

        inject(function ($rootScope, $controller, $compile, $q, $sorter) {
            scope = $rootScope.$new();
            sorter = $sorter;

            stubContactsPromise = $q.defer();
            deferred = $q.defer();
            stubContactPromise = $q.defer();
            toastPromise = $q.defer();
            mockContactService.all.and.returnValue(stubContactsPromise.promise);
            mockContactService.create.and.returnValue(stubContactPromise.promise);
            mockContactService.update.and.returnValue(deferred.promise);
            mockContactService.del.and.returnValue(deferred.promise);
            mockToastProvider.create.and.returnValue(toastPromise.promise);

            spyOn(angular, 'element').and.callFake(function () {
                return {
                    modal : jasmine.createSpy('modal').and.callFake(function (status) {
                        return status;
                    })};
            });

            $controller('ContactController',
                {
                    $scope: scope,
                    ContactService: mockContactService,
                    $sorter: sorter,
                    ngToast: mockToastProvider
                });

        });
    });

     describe('change sort arrow direction on sorting column in contacts',function(){
         var criteria = 'some_criteria';

         it('should return an down arrow class if a criteria is used to sort contacts)', function () {
             scope.initialize();
             scope.$apply();
             scope.sort.criteria = criteria;

             expect(scope.sortArrowClass(criteria)).toEqual('active glyphicon glyphicon-arrow-down');
         });

         it('should return an up arrow class if same criteria is used to sort contacts again)', function () {
             scope.initialize();
             scope.$apply();
             scope.sort.criteria = criteria;
             scope.sort.descending = true;

             expect(scope.sortArrowClass(criteria)).toEqual('active glyphicon glyphicon-arrow-up');
         });
    });

    it('should fetch all contacts', function () {
        stubContactsPromise.resolve(stubContacts);
        scope.initialize();
        scope.$apply();

        expect(scope.contacts).toEqual(stubContacts);
    });

    describe('showing modals', function () {
        it('should show the add contact modal', function () {
            scope.showAddContact();

            expect(angular.element).toHaveBeenCalledWith('#add-contact-modal');
        });

        it('should show the edit contact modal', function () {
            scope.showEditContact(stubContact);
            scope.$apply();

            expect(scope.currentContact).toEqual(stubContact);
            expect(angular.element).toHaveBeenCalledWith('#edit-contact-modal');
        });

        it('should show the delete contact modal', function () {
            scope.showDeleteContact(stubContact);
            scope.$apply();

            expect(scope.currentContact).toEqual(stubContact);
            expect(angular.element).toHaveBeenCalledWith('#delete-contact-modal');
        });
    });

    describe('validating a contact', function () {
        it('should be invalid when no number is supplied', function () {
            scope.contact = {
                firstName: 'Dude',
                lastName: 'Awesome',
                phone: ''
            };
            scope.$apply();

            expect(scope.invalidContact(scope.contact)).toBeTruthy();
        });

        it('should be invalid when no first name is supplied', function () {
            scope.contact = {
                firstName: '',
                lastName: 'Awesome',
                phone: '+256782555444'
            };
            scope.$apply();

            expect(scope.invalidContact(scope.contact)).toBeTruthy();
        });

        it('should be invalid when no last name is supplied', function () {
            scope.contact = {
                firstName: 'Dudette',
                lastName: '',
                phone: '+256782555444'
            };
            scope.$apply();

            expect(scope.invalidContact(scope.contact)).toBeTruthy();
        });

        it('should be valid when full name and phone number are supplied', function () {
            scope.contact = {
                firstName: 'Dudette',
                lastName: 'Awesome',
                phone: '+256782555444'
            };
            scope.$apply();

            expect(scope.invalidContact(scope.contact)).toBeFalsy();
        });

    });

    describe('adding a contact', function () {
        it('should save contact', function () {
            stubContactPromise.resolve(stubContact);

            scope.contact = stubNewContact;
            scope.saveContact();
            scope.$apply();

            expect(angular.element).toHaveBeenCalledWith('#add-contact-modal');
            expect(mockContactService.create).toHaveBeenCalledWith(stubNewContact);
        });

        it('should show an error if contact service is down', function() {
            stubContactPromise.reject({status: 0});
            toastPromise.resolve();

            scope.contact = stubNewContact;
            scope.saveContact();
            scope.$apply();

            expect(mockToastProvider.create).toHaveBeenCalledWith({
                content: 'Contact service down',
                class: 'danger',
                maxNumber: 1,
                dismissOnTimeout: true
            });
        });

        it('should show an error if contact data is invalid', function() {
            stubContactPromise.reject({status: 400, data: {error: 'Phone number format invalid'}});
            toastPromise.resolve();

            scope.contact = stubNewContact;
            scope.saveContact();
            scope.$apply();

            expect(mockToastProvider.create).toHaveBeenCalledWith({
                content: 'Phone number format invalid',
                class: 'danger',
                maxNumber: 1,
                dismissOnTimeout: true
            });
        });
    });

    describe('editing a contact', function () {
        it('should edit a contact', function () {
            deferred.resolve();
            scope.update(stubContact);
            scope.$apply();

            expect(angular.element).toHaveBeenCalledWith('#edit-contact-modal');
            expect(mockContactService.update).toHaveBeenCalledWith(stubContact);
            expect(mockContactService.all).toHaveBeenCalled();
        });
    });

    describe('deleting a contact', function () {
        it('should delete a contact', function () {
            stubContacts.push(stubContact);
            scope.contacts = stubContacts;
            scope.currentContact = stubContact;
            deferred.resolve();

            scope.deleteSelectedContact();
            scope.$apply();

            expect(angular.element).toHaveBeenCalledWith('#delete-contact-modal');
            expect(mockContactService.del).toHaveBeenCalledWith(stubContact);
        });
    });

});