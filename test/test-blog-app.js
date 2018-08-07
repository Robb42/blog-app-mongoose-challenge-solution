'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];
    for (let i=0; i<=10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            content: faker.lorem.text(),
            title: faker.lorem.sentence()
        });
    }
    return BlogPost.insertMany(seedData);
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('BlogPosts API', function () {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function () {
        return seedBlogData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app).get('/posts').then(function(_res) {
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.blogposts).to.have.lengthOf.at.least(1);
                return BlogPosts.count();
            }).then(function(count) {
                expect(res.body.blogposts).to.have.lengthOf(count);
            });
        });
        
        it('should return blog posts with right fields', function() {
            let resBlogpost;
            return chai.request(app).get('/posts').then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.blogposts).to.be.a('array');
                expect(res.body.blogposts).to.have.lengthOf.at.least(1);
                res.body.blogposts.forEach(function(blogpost) {
                    expect(blogpost).to.be.a('object');
                    expect(blogpost).to.include.keys('author', 'content', 'title', 'id', 'created');
                });
                resBlogpost = res.body.blogposts[0];
                return BlogPost.findById(resBlogpost.id);
            }).then(function(blogpost) {
                expect(resBlogpost.id).to.equal(blogpost.id);
                expect(resBlogpost.author.firstName).to.equal(blogpost.author.firstName);
                expect(resBlogpost.author.lastName).to.equal(blogpost.author.lastName);
                expect(resBlogpost.content).to.equal(blogpost.content);
                expect(resBlogpost.title).to.equal(blogpost.title);
            });
        });
    });

    describe('POST endpoint', function() {
        it('should add a new blog post', function() {
            const newBlogpost = {
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName()
                },
                content: faker.lorem.text(),
                title: faker.lorem.sentence()
            };
            return chai.request(app).post('/posts').send(newBlogpost).then(function(res) {
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('id', 'author', 'content', 'title', 'created');
                expect(res.body.title).to.equal(newBlogpost.title);
                expect(res.body.id).to.not.be.null;
                expect(res.body.author.firstName).to.equal(newBlogpost.author.firstName);
                expect(res.body.author.lastName).to.equal(newBlogpost.author.lastName);
                expect(res.body.content).to.equal(newBlogpost.content);
                return BlogPost.findById(res.body.id);
            }).then (function(blogpost) {
                expect(blogpost.title).to.equal(newBlogpost.title);
                expect(blogpost.author.firstName).to.equal(newBlogpost.author.firstName);
                expect(blogpost.author.lastname).to.equal(newBlogpost.author.lastName);
                expect(blogpost.content).to.equal(newBlogpost.content);
            });
        });
    });

    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                title: 'new testing title',
                content: 'hope this works!'
            };
            return BlogPost.findOne().then(function(blogpost) {
                updateData.id = blogpost.id;
                return chai.request(app).put(`/posts/${blogpost.id}`).send(updateData);
            }).then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(updateData.id);
            }).then(function(blogpost) {
                expect(blogpost.title).to.equal(updateData.title);
                expect(blogpost.content).to.equal(updateData.content);
            });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete a blog post', function() {
            let blogpost;
            return BlogPost.findOne().then(function(_blogpost) {
                blogpost = _blogpost;
                return chai.request(app).delete(`/posts/${blogpost.id}`);
            }).then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(blogpost.id);
            }).then(function(_blogpost) {
                expect(_blogpost).to.be.null;
            });
        });
    });
});