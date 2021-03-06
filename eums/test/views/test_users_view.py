import json
from urllib import quote

from django.test import TestCase

from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.urlresolvers import reverse
from django.test import Client

from eums.forms.filter import UserFilterForm
from eums.forms.user_profile import UserProfileForm, EditUserProfileForm
from eums.models import UserProfile


class UsersViewTest(TestCase):
    GLOBAL_ADMIN = 'GLOBAL_ADMIN'

    def create_user(self, username=None):
        username = username if username else "user"
        user = User.objects.create(username=username, email="user@mail.com")
        UserProfile.objects.create(user=user)
        user.set_password("pass")
        user.save()
        return user

    def assign(self, permissions, user):
        auth_content = ContentType.objects.get_for_model(Permission)
        group = Group.objects.get_or_create(name="Group with %s permissions" % permissions)[0]
        permission, out = Permission.objects.get_or_create(codename=permissions, content_type=auth_content)
        group.permissions.add(permission)
        group.user_set.add(user)
        return user

    def login_user(self):
        self.client.login(username='user', password='pass')

    def assert_login_required(self, url):
        self.client.logout()
        response = self.client.get(url)
        self.assertRedirects(response, expected_url='/login?next=%s' % quote(url),
                             status_code=302, target_status_code=301, msg_prefix='')

    def assert_permission_required(self, url):
        self.client.logout()
        self.client.login(username='user_with_no_perms', password='pass')
        response = self.client.get(url)
        self.assertRedirects(response, expected_url='/login?next=%s' % quote(url),
                             status_code=302, target_status_code=301, msg_prefix='')

    def setUp(self):
        self.client = Client()
        self.user = self.create_user()
        self.assign('can_view_users', self.user)
        self.login_user()
        self.global_admin = Group.objects.create(name='Global Admin')
        auth_content = ContentType.objects.get_for_model(Permission)
        permission, out = Permission.objects.get_or_create(codename='is_global_admin', content_type=auth_content)
        self.global_admin.permissions.add(permission)
        self.global_admin.user_set.add(self.user)

        self.form_data = {
            'username': 'rajni',
            'password1': 'kant',
            'password2': 'kant',
            'email': 'raj@ni.kant',
            'groups': self.global_admin.id,
        }

    def test_get_login(self):
        response = self.client.get('/login/')
        self.assertEqual(200, response.status_code)
        templates = [template.name for template in response.templates]
        self.assertIn('registration/login.html', templates)

    def test_get_list_users(self):
        user2 = User.objects.create(username='user1', email='rajni@kant.com')

        response = self.client.get('/users/')
        self.assertEqual(200, response.status_code)
        templates = [template.name for template in response.templates]
        self.assertIn('users/index.html', templates)
        self.assertIsInstance(response.context['filter_form'], UserFilterForm)
        self.assertIn(self.user, response.context['users'])
        self.assertIn(user2, response.context['users'])

    def test_get_new(self):
        response = self.client.get('/users/new/')
        self.assertEqual(200, response.status_code)
        templates = [template.name for template in response.templates]
        self.assertIn('users/new.html', templates)
        self.assertIsInstance(response.context['form'], UserProfileForm)
        self.assertEqual('CREATE', response.context['btn_label'])
        self.assertEqual('Create new user', response.context['title'])
        self.assertEqual(reverse('list_users_page'), response.context['cancel_url'])

    def test_post_new_user(self):
        response = self.client.post('/users/new/', data=self.form_data)
        self.assertRedirects(response, expected_url='/users/')
        user = User.objects.filter(username=self.form_data['username'])
        self.failUnless(user)
        self.assertIn('created successfully.', response.cookies['messages'].value)

    def test_assert_login_required_for_create_new_user(self):
        self.assert_login_required('/users/new/')

    def test_permission_required(self):
        self.assert_permission_required('/users/new/')

    def test_get_edit_user(self):
        response = self.client.get('/users/%d/edit/' % self.user.pk)
        self.assertEqual(200, response.status_code)
        templates = [template.name for template in response.templates]
        self.assertIn('users/new.html', templates)
        self.assertIsInstance(response.context['form'], EditUserProfileForm)
        self.assertEqual('SAVE', response.context['btn_label'])
        self.assertEqual('Edit User', response.context['title'])
        self.assertEqual('/users/', response.context['cancel_url'])

    def test_post_update(self):
        saved_user = User.objects.create(username='user1', email='emily@gmail.com')
        user_profile = UserProfile.objects.create(user=saved_user)
        self.global_admin.user_set.add(saved_user)
        form_data = {
            'username': 'user1tom',
            'email': 'raj@ni.kant', }
        response = self.client.post('/users/%d/edit/' % saved_user.pk, data=form_data)
        self.assertRedirects(response, expected_url='/users/')

        user_profile = UserProfile.objects.get(user=saved_user)
        self.failUnless(user_profile)
        self.assertEqual(1, len(saved_user.groups.all()))
        self.assertIn(self.global_admin, saved_user.groups.all())
        self.assertEqual(1, saved_user.groups.all().count())
        self.failUnless(User.objects.filter(**form_data))
        self.failIf(User.objects.filter(username='user1', email='emily@gmail.com'))
        message = "%s was successfully updated" % form_data['username']
        self.assertIn(message, response.cookies['messages'].value)

    def test_post_update_with_errors(self):
        saved_user = User.objects.create(username='user1', email='emily@gmail.com')
        user_profile = UserProfile.objects.create(user=saved_user)
        self.global_admin.user_set.add(saved_user)
        form_data = {
            'username': 'user1tom hjdhdh',
            'email': 'raj@ni.kant', }
        response = self.client.post('/users/%d/edit/' % saved_user.pk, data=form_data)
        self.assertEqual(200, response.status_code)
        self.failUnless(User.objects.filter(username='user1', email='emily@gmail.com'))
        self.failIf(User.objects.filter(**form_data))
        message = "User was not updated, see errors below"
        self.assertIn(message, response.content)
        self.assertIsInstance(response.context['form'], EditUserProfileForm)
        self.assertIn('SAVE', response.context['btn_label'])
        self.assertIn('Edit User', response.context['title'])

    def test_post_update_with_no_email_shows_errors(self):
        saved_user = User.objects.create(username='user1', email='testuser@unicef.org')
        user_profile = UserProfile.objects.create(user=saved_user)
        self.global_admin.user_set.add(saved_user)
        form_data = {
            'username': 'user1tom'}
        response = self.client.post('/users/%d/edit/' % saved_user.pk, data=form_data)
        self.assertEqual(200, response.status_code)
        self.failUnless(User.objects.filter(username='user1', email='testuser@unicef.org'))
        self.failIf(User.objects.filter(**form_data))
        message = "User was not updated, see errors below"
        self.assertIn(message, response.content)
        self.assertIsInstance(response.context['form'], EditUserProfileForm)
        self.assertIn('SAVE', response.context['btn_label'])
        self.assertIn('Edit User', response.context['title'])
