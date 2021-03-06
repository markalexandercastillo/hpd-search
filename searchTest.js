const { search, queries, aggregations } = require('./lib/elasticsearch').dsl
  , { building } = require('./src/query')
  , axios = require('axios');

const buildingRepository = axios.create({
  baseURL: 'http://localhost:9200/hpd/_search',
  method: 'post',
});

const buildingSearch = search({
  size: 10,
  ...search.query(Queries.bool({
    ...Queries.bool.filter(
      building.clauses.inBrooklyn(),
      building.clauses.hasViolations(),
      building.clauses.hasComplaints(),
      building.clauses.hasRegistration(),
      building.clauses.hasLitigations(),
    )
  })),
  ...search.aggs(
    building.Aggregations.centroid(),
    building.Aggregations.viewport(),
    Aggregations.terms('borough', 'borough', 1000),
    Aggregations.terms('censusTract', 'censusTract', 1000),
    Aggregations.terms('class', 'class', 1000),
    Aggregations.terms('communityBoard', 'communityBoard', 1000),
    Aggregations.terms('management', 'management', 1000),
    Aggregations.terms('postalCode', 'postalCode', 1000),
    Aggregations.terms('status', 'status', 1000),
    Aggregations.nested(
      'complaints',
      Aggregations.terms('status', 'complaints.status', 1000),
      Aggregations.nested(
        'complaints.problems',
        Aggregations.terms('code', 'complaints.problems.code', 1000),
        Aggregations.terms('majorCategory', 'complaints.problems.majorCategory', 1000),
        Aggregations.terms('minorCategory', 'complaints.problems.minorCategory', 1000),
        Aggregations.terms('spaceType', 'complaints.problems.spaceType', 1000),
        Aggregations.terms('status', 'complaints.problems.status', 1000),
        Aggregations.terms('type', 'complaints.problems.type', 1000),
        Aggregations.terms('unitType', 'complaints.problems.unitType', 1000),
      ),
    ),
  )
});

const jsonPrettify = data => console.log(JSON.stringify(data, null, '  '));

jsonPrettify(buildingSearch);

buildingRepository({
  data: buildingSearch,
}).then(response => jsonPrettify(response.data.Aggregations))
  .catch(e => jsonPrettify(e.response.data.error));

