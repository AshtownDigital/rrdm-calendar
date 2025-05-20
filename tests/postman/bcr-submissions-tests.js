/**
 * Postman test scripts for BCR submissions
 * These tests can be added to the "Tests" tab in Postman for each request
 */

// Test for Create BCR Submission
pm.test("Status code is 302 (redirect after successful submission)", function () {
    pm.expect(pm.response.code).to.equal(302);
});

pm.test("Redirect location contains bcr-submissions path", function () {
    pm.response.to.have.header("Location");
    const location = pm.response.headers.get("Location");
    pm.expect(location).to.include("bcr-submissions");
    
    // Extract the BCR ID from the redirect URL and save it for later tests
    const bcrId = location.split("/").pop();
    if (bcrId) {
        pm.environment.set("bcr_id", bcrId);
        console.log("Saved BCR ID: " + bcrId);
    }
});

// Test for Get BCR Submission by ID
pm.test("Status code is 200", function () {
    pm.expect(pm.response.code).to.equal(200);
});

pm.test("Response contains BCR details", function () {
    const responseBody = pm.response.text();
    
    // Check for key BCR elements in the HTML response
    pm.expect(responseBody).to.include("Business Change Request");
    
    // Check for the BCR code format (BCR-YY/YY-XXXX)
    const bcrCodeRegex = /BCR-\d{2}\/\d{2}-\d{4}/;
    pm.expect(responseBody).to.match(bcrCodeRegex);
    
    // Check for status tag with appropriate GOV.UK Design System color class
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--blue") || 
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--light-blue") ||
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--green") ||
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--grey") ||
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--red");
    
    // Check for priority tag
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--yellow") || // Medium
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--green") ||  // Low
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--orange") || // High
    pm.expect(responseBody).to.include("govuk-tag govuk-tag--red");      // Critical
});

// Test for Delete BCR Submission
pm.test("Status code is 302 (redirect after successful deletion)", function () {
    pm.expect(pm.response.code).to.equal(302);
});

pm.test("Redirect location is to BCR submissions list", function () {
    pm.response.to.have.header("Location");
    const location = pm.response.headers.get("Location");
    pm.expect(location).to.equal("/bcr/submissions");
});

// Verify deletion by trying to access the deleted BCR
pm.sendRequest({
    url: `http://localhost:3000/direct/bcr-submissions/${pm.environment.get("bcr_id")}`,
    method: 'GET',
    header: {
        'Cookie': `connect.sid=${pm.environment.get("session_id")}`
    }
}, function (err, res) {
    pm.test("Deleted BCR should return 404 Not Found", function () {
        pm.expect(res.code).to.equal(404);
    });
});

// Test for Create Critical Priority BCR
pm.test("Status code is 302 (redirect after successful submission)", function () {
    pm.expect(pm.response.code).to.equal(302);
});

pm.test("Critical priority BCR should be created", function () {
    pm.response.to.have.header("Location");
    const location = pm.response.headers.get("Location");
    pm.expect(location).to.include("bcr-submissions");
    
    // Extract the BCR ID from the redirect URL and save it
    const bcrId = location.split("/").pop();
    if (bcrId) {
        pm.environment.set("critical_bcr_id", bcrId);
        console.log("Saved Critical BCR ID: " + bcrId);
    }
    
    // Verify the critical priority by checking the BCR details
    pm.sendRequest({
        url: `http://localhost:3000/direct/bcr-submissions/${bcrId}`,
        method: 'GET',
        header: {
            'Cookie': `connect.sid=${pm.environment.get("session_id")}`
        }
    }, function (err, res) {
        pm.test("Critical BCR should have red priority tag", function () {
            pm.expect(res.text()).to.include("govuk-tag govuk-tag--red");
        });
    });
});
