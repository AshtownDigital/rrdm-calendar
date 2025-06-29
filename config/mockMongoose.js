/**
 * Mock MongoDB Connection for Development/Testing
 * Provides mock implementations for mongoose connection and collections
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Make mockData global at module scope so it's accessible to all functions
const mockData = {};
const EventEmitter = require('events'); // For cursor events

// Helper functions (simple implementations)
function get(obj, path, defaultValue) {
  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[keys[i]];
  }
  return current === undefined ? defaultValue : current;
}

function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}

function setupMockMongoose() {
  console.log('Setting up complete mock for mongoose connection');
  
  // Load mock data for all available collections into the module-scoped mockData object
  const mockDataDir = path.join(__dirname, '../mock-data');
  
  if (fs.existsSync(mockDataDir)) {
    console.log('Loading all mock data from:', mockDataDir);
    const files = fs.readdirSync(mockDataDir);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const collectionName = file.replace('.json', '').replace('-', '_');
          const rawData = fs.readFileSync(path.join(mockDataDir, file), 'utf8');
          mockData[collectionName] = JSON.parse(rawData);
          console.log(`Loaded mock data for collection: ${collectionName} (${mockData[collectionName].length} documents)`);
        } catch (error) {
          console.error(`Error loading mock data from ${file}:`, error);
        }
      }
    });
  }

  // Ensure users collection exists even if no mock data
  if (!mockData.users) {
    mockData.users = [
      {
        "_id": "mock-user-1",
        "name": "Admin User",
        "email": "admin@example.com",
        "password": "$2a$10$zH17VKFDTeJynMkMD/6IeOUamvDXCLHb9TladWvniZ6oUxTrKpie2",
        "role": "admin",
        "active": true
      },
      {
        "_id": "mock-user-2",
        "name": "Business User",
        "email": "business@example.com",
        "password": "$2a$10$zH17VKFDTeJynMkMD/6IeOUamvDXCLHb9TladWvniZ6oUxTrKpie2",
        "role": "business",
        "active": true
      }
    ];
    console.log(`Created default mock data for users collection with ${mockData.users.length} users`);
  }
  
  const mockModels = {};

  // Helper to resolve model name to mockData key
  const resolveCollectionKeyForModel = (modelNameForResolve) => {
    let key = modelNameForResolve.toLowerCase();
    const modelNameLowerForResolve = modelNameForResolve.toLowerCase();

    const potentialKeysForResolve = [
      modelNameLowerForResolve + 's',
      modelNameForResolve.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1) + 's',
      modelNameForResolve.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1),
      modelNameLowerForResolve
    ];

    const knownMappingsForResolve = {
      'AcademicYear': 'academic_years',
      'BcrSubmission': 'bcr_submissions',
      'ReleaseNote': 'release_notes',
    };

    if (knownMappingsForResolve[modelNameForResolve] && mockData[knownMappingsForResolve[modelNameForResolve]]) {
      key = knownMappingsForResolve[modelNameForResolve];
    } else {
      for (const pk of potentialKeysForResolve) {
        if (mockData[pk]) {
          key = pk;
          break;
        }
      }
    }
    if (!mockData[key] && mockData[modelNameForResolve]) { 
        key = modelNameForResolve;
    } else if (!mockData[key] && mockData[modelNameLowerForResolve]) {
        key = modelNameLowerForResolve;
    }
    return key;
  };

  // Define custom collection handlers for specific collection operations
  const createMockCollection = (name, resolveCollectionKeyFunc) => {
    // Logic to find the correct key for mockData
    let collectionKey = name.toLowerCase(); // Default e.g. 'user'
    const modelNameLower = name.toLowerCase();

    const potentialKeys = [
      modelNameLower + 's', // e.g., 'users' for 'User'
      name.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1) + 's', // e.g., 'academic_years' for 'AcademicYear'
      name.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1), // e.g., 'release_note' for 'ReleaseNote'
      modelNameLower // e.g. 'user' for 'User'
    ];

    // Specific overrides if naming is very custom
    const knownMappings = {
      'AcademicYear': 'academic_years',
      'BcrSubmission': 'bcr_submissions',
      'ReleaseNote': 'release_notes',
      // Add more if needed for files like 'users.json' -> 'User' model
    };

    if (knownMappings[name] && mockData[knownMappings[name]]) {
      collectionKey = knownMappings[name];
    } else {
      for (const key of potentialKeys) {
        if (mockData[key]) {
          collectionKey = key;
          break;
        }
      }
    }
    // If no specific key found, it might be that the mock data file is named exactly as the model (e.g. 'User.json' for 'User' model)
    // or the initial load used a simple lowercase name.
    if (!mockData[collectionKey] && mockData[name]) { // Check original 'name' as a fallback
        collectionKey = name;
    } else if (!mockData[collectionKey] && mockData[modelNameLower]) { // Check simple lowercase as a fallback
        collectionKey = modelNameLower;
    }

    const collectionData = mockData[collectionKey] || []; // Use module-scoped mockData
    console.log(`[Mock Collection Setup] Model: ${name}, Deduced mockData key: '${collectionKey}', Initial data length: ${collectionData.length}`);
    if (collectionData.length === 0) {
      console.warn(`[Mock Collection Warning] Model: ${name} - No mock data found for key '${collectionKey}'. Collection will be empty.`);
    }
    
    // Create an event emitter to mimic MongoDB's cursor events
    const cursorEmitter = new EventEmitter();
    
    // Basic cursor implementation
    const createCursor = () => {
      const cursor = {
        limit: (n) => { 
          cursor._limit = n; 
          return cursor; 
        },
        skip: (n) => { 
          cursor._skip = n; 
          return cursor; 
        },
        sort: (sortObj) => {
          cursor._sort = sortObj;
          return cursor;
        },
        toArray: () => {
          setTimeout(() => {
            cursorEmitter.emit('end');
          }, 0);
          return Promise.resolve(collectionData);
        },
        forEach: (callback) => {
          collectionData.forEach(callback);
          setTimeout(() => {
            cursorEmitter.emit('end');
          }, 0);
          return Promise.resolve();
        },
        on: (event, handler) => {
          cursorEmitter.on(event, handler);
          return cursor;
        },
        // Add any other cursor methods you need
      };
      return cursor;
    };
    
    class QueryLike {
      constructor(data, resolveCollectionKeyHelper) {
        this._data = Array.isArray(data) ? data : (data ? [data] : []);
        this._isLean = false;
        this._allMockData = mockData; // Use module-scoped mockData directly
        this._resolveCollectionKey = resolveCollectionKeyHelper; // Store resolver function
      }

      lean() {
        console.log('Mock QueryLike .lean called');
        this._isLean = true;
        return this;
      }

      exec() {
        console.log('Mock QueryLike .exec called');
        const result = this._isLean ? JSON.parse(JSON.stringify(this._data)) : this._data.map(d => ({ ...d, toObject: () => ({ ...d }) }));
        return Promise.resolve(result);
      }

      sort(sortObj) {
        console.log('Mock QueryLike .sort called with', sortObj);
        if (this._data && Object.keys(sortObj).length > 0) {
          const sortField = Object.keys(sortObj)[0];
          const sortOrder = sortObj[sortField] === 1 || sortObj[sortField] === 'asc' ? 1 : -1;
          this._data.sort((a, b) => {
            if (a[sortField] < b[sortField]) return -1 * sortOrder;
            if (a[sortField] > b[sortField]) return 1 * sortOrder;
            return 0;
          });
        }
        return this;
      }

      limit(limitNum) {
        console.log('Mock QueryLike .limit called with', limitNum);
        if (limitNum > 0) {
          this._data = this._data.slice(0, limitNum);
        }
        return this;
      }

      skip(skipNum) {
        console.log('Mock QueryLike .skip called with', skipNum);
        if (skipNum > 0) {
          this._data = this._data.slice(skipNum);
        }
        return this;
      }

      select(selectFields) {
        console.log('Mock QueryLike .select called with', selectFields);
        if (typeof selectFields === 'string' && selectFields.trim() !== '' && !selectFields.startsWith('-')) {
          const fieldsToKeep = selectFields.split(' ');
          this._data = this._data.map(doc => {
            const newDoc = {};
            fieldsToKeep.forEach(field => {
              if (Object.prototype.hasOwnProperty.call(doc, field)) {
                newDoc[field] = doc[field];
              }
            });
            return newDoc;
          });
        }
        return this;
      }
      
      populate(path, select) {
        console.log(`Mock QueryLike .populate called with path: '${path}', select: '${select}'`);
        if (!this._data || this._data.length === 0) return this;
        if (!this._allMockData || !this._resolveCollectionKey) {
          console.error('[Mock Populate] Missing allMockData or resolveCollectionKey helper.');
          return this;
        }

        // Infer target model name from path (e.g., 'AcademicYearID' -> 'AcademicYear')
        let targetModelName = path.replace(/ID$/, '').replace(/_id$/, '');
        // Simple PascalCase conversion (e.g. academicYear -> AcademicYear, release_note -> ReleaseNote)
        targetModelName = targetModelName.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        targetModelName = targetModelName.charAt(0).toUpperCase() + targetModelName.slice(1);
        
        console.log(`[Mock Populate] Inferred target model: ${targetModelName} from path: ${path}`);

        const targetCollectionKey = this._resolveCollectionKey(targetModelName);
        const targetCollectionData = this._allMockData[targetCollectionKey] || [];

        if (targetCollectionData.length === 0) {
          console.warn(`[Mock Populate] No data found for target collection: ${targetModelName} (key: ${targetCollectionKey})`);
          // Optionally, set the path to null or keep the ID if no related doc found, Mongoose might do this.
          // For now, we'll leave the original ID if no populated doc is found.
          return this;
        }

        this._data = this._data.map(doc => {
          const foreignKeyValue = get(doc, path);
          if (foreignKeyValue === undefined || foreignKeyValue === null) return doc;

          const populatedDoc = targetCollectionData.find(targetDoc => {
            const targetId = get(targetDoc, '_id');
            // Handle cases where foreignKeyValue might be an object (populated already) or primitive
            const idToCompare = (typeof foreignKeyValue === 'object' && foreignKeyValue !== null && foreignKeyValue._id) ? foreignKeyValue._id : foreignKeyValue;
            return deepEqual(targetId, idToCompare);
          });

          if (populatedDoc) {
            let finalPopulatedDoc = { ...populatedDoc }; // Clone to avoid modifying cache
            if (select && typeof select === 'string') {
              const fieldsToSelect = select.split(' ');
              const selectedFields = {};
              fieldsToSelect.forEach(field => {
                if (Object.prototype.hasOwnProperty.call(finalPopulatedDoc, field)) {
                  selectedFields[field] = finalPopulatedDoc[field];
                }
              });
              // Ensure _id is always included if not explicitly excluded (Mongoose behavior)
              if (!fieldsToSelect.includes('_id') && Object.prototype.hasOwnProperty.call(finalPopulatedDoc, '_id')) {
                  selectedFields._id = finalPopulatedDoc._id;
              }
              finalPopulatedDoc = selectedFields;
            }
            // Mongoose replaces the field that held the ID with the populated object.
            // If path was 'academicYearID', it might become 'academicYear' or stay 'academicYearID'.
            // For simplicity, we'll replace the original path.
            const newDoc = { ...doc };
            newDoc[path] = finalPopulatedDoc;
            return newDoc;
          }
          return doc; // Return original doc if no population occurred
        });
        return this;
      }
    }

    return {
      find: (query = {}) => {
        console.log(`Mock collection '${name}' find with query:`, JSON.stringify(query));
        console.log('QueryLike.prototype.populate:', QueryLike.prototype.populate);
        const filteredData = collectionData.filter(doc => {
          if (!query || Object.keys(query).length === 0) return true; // Return all if query is empty or undefined
          return Object.keys(query).every(key => {
            const queryValue = query[key];
            const docValue = get(doc, key); // Uses helper 'get' for nested paths

            if (queryValue && typeof queryValue === 'object' && !Array.isArray(queryValue)) { // Handle query operators like $in, $ne, $exists
              if (queryValue.$in !== undefined) {
                return Array.isArray(queryValue.$in) && queryValue.$in.some(item => deepEqual(item, docValue));
              }
              if (queryValue.$ne !== undefined) {
                return !deepEqual(docValue, queryValue.$ne);
              }
              if (queryValue.$exists !== undefined) {
                let pathExists = true;
                let current = doc;
                const parts = key.split('.');
                for(let i=0; i < parts.length; ++i) {
                    if(!current || !Object.prototype.hasOwnProperty.call(current, parts[i])) {
                        pathExists = false;
                        break;
                    }
                    current = current[parts[i]];
                }
                return queryValue.$exists ? pathExists : !pathExists;
              }
              // Add other operators like $gt, $lt, $gte, $lte, $regex here if needed
              // Fallback for unhandled operators or direct object comparison (if queryValue is an object without operators)
              return deepEqual(docValue, queryValue);
            }
            // Direct comparison for primitive values or arrays in query
            return deepEqual(docValue, queryValue);
          });
        });
        console.log(`[Mock ${name}.find] Filtered data length: ${filteredData.length}`);
        const queryLikeInstance = new QueryLike(filteredData, resolveCollectionKeyFunc);
        console.log('queryLike.populate:', queryLikeInstance.populate);
        return queryLikeInstance;
      },
      findOne: function(query = {}) {
        const collectionName = name; // Capture collection name for logs
        
        // This is the chainable query object returned by findOne
        const chainableQuery = {
          _query: query,
          _isLean: false,
          _populateArgs: null,
          _selectArgs: null,

          lean: function(val = true) {
            this._isLean = val;
            console.log(`[Mock ${collectionName}.findOne.lean] Lean set to: ${this._isLean}`);
            return this;
          },

          populate: function(path, select) {
            console.log(`[Mock ${collectionName}.findOne.populate] Path: '${path}', Select: '${select}'`);
            this._populateArgs = { path, select };
            return this;
          },

          select: function(fields) {
            console.log(`[Mock ${collectionName}.findOne.select] Fields: '${fields}' (Note: findOne population handles select)`);
            // Select for findOne is often handled by the populate's select, or by schema defaults.
            // We'll store it in case, but primary selection happens in populate logic for populated fields.
            this._selectArgs = fields;
            return this;
          },

          exec: async function() {
            console.log(`[Mock ${collectionName}.findOne.exec] Query:`, JSON.stringify(this._query), `Lean: ${this._isLean}`);
            const foundDoc = collectionData.find(doc => {
              return Object.keys(this._query).every(key => {
                const queryVal = this._query[key];
                const docVal = get(doc, key);
                if (key === '_id') {
                  return String(docVal) === String(queryVal);
                }
                return deepEqual(docVal, queryVal);
              });
            });

            if (!foundDoc) {
              console.log(`[Mock ${collectionName}.findOne.exec] No document found.`);
              return null;
            }

            let resultToReturn = { ...foundDoc }; // Clone to avoid modifying cache

            if (this._populateArgs) {
              console.log(`[Mock ${collectionName}.findOne.exec] Attempting population:`, this._populateArgs);
              // Use a QueryLike instance to perform the population on the single found document
              // allMockData and resolveCollectionKeyFunc are from the outer createMockCollection scope
              const tempPopulater = new QueryLike([resultToReturn], resolveCollectionKeyFunc); // Pass only data and resolver
              tempPopulater.populate(this._populateArgs.path, this._populateArgs.select);
              const populatedDataArray = await tempPopulater.exec(); // exec returns a promise with an array
              if (populatedDataArray && populatedDataArray.length > 0) {
                resultToReturn = populatedDataArray[0];
              }
              console.log(`[Mock ${collectionName}.findOne.exec] After population attempt, result:`, resultToReturn ? JSON.stringify(resultToReturn).substring(0,100)+'...' : null);
            }
            
            if (this._isLean) {
              // For lean, ensure it's a plain object without Mongoose extras (though our mocks are already plain)
              // The toObject part is more for QueryLike's exec, but good to be consistent.
              resultToReturn = JSON.parse(JSON.stringify(resultToReturn)); 
            } else {
              // If not lean, ensure it has a toObject method, even if basic
              if (resultToReturn && typeof resultToReturn.toObject !== 'function') {
                resultToReturn.toObject = function() { return { ...this }; };
              }
            }

            console.log(`[Mock ${collectionName}.findOne.exec] Final result:`, resultToReturn ? JSON.stringify(resultToReturn).substring(0,100)+'...' : null);
            return resultToReturn;
          },

          // then and catch to make it awaitable / promise-like
          then: function(onFulfilled, onRejected) {
            return this.exec().then(onFulfilled, onRejected);
          },
          catch: function(onRejected) {
            return this.exec().catch(onRejected);
          },
          
          // Common Mongoose Query methods (mostly no-op for findOne unless they affect population or selection)
          sort: function(sortObj) { 
            console.log(`[Mock ${collectionName}.findOne.sort] Called with:`, sortObj, '(no-op for findOne)');
            return this; 
          },
          limit: function(limitNum) { 
            console.log(`[Mock ${collectionName}.findOne.limit] Called with:`, limitNum, '(no-op for findOne)');
            return this; 
          },
          skip: function(skipNum) { 
            console.log(`[Mock ${collectionName}.findOne.skip] Called with:`, skipNum, '(no-op for findOne)');
            return this; 
          }
        };

        return chainableQuery;
      },
      findById: function(id, _projection, _options) { // projection and options are often optional
        const collectionName = name; // Capture collection name for logging
        console.log(`[Mock ${collectionName}.findById] ID:`, id);
        // findById is essentially findOne({ _id: id })
        // 'this' here refers to the object returned by createMockCollection, which has the findOne method.
        return this.findOne({ _id: id }); 
        // The returned object from this.findOne is already our chainable Query-like object,
        // so it will support .lean(), .exec(), .populate(), and direct await.
      },
      countDocuments: function(query = {}) { // Changed to function to access 'this' if needed, and use collectionData from outer scope
        console.log(`Mock collection '${name}' countDocuments with query:`, JSON.stringify(query));
        // collectionData is from the outer scope of createMockCollection
        const currentCollectionData = collectionData; 

        return {
          exec: () => {
            const itemsToSearch = currentCollectionData.filter(doc => {
              if (!query || Object.keys(query).length === 0) return true;
              return Object.keys(query).every(key => {
                // Using the helper functions 'get' and 'deepEqual' defined at the top of the file
                if (typeof query[key] === 'object' && query[key] !== null && query[key].$ne !== undefined) {
                  return !deepEqual(get(doc, key), query[key].$ne);
                }
                if (typeof query[key] === 'object' && query[key] !== null && query[key].$in !== undefined) {
                  return query[key].$in.includes(get(doc, key));
                }
                if (typeof query[key] === 'object' && query[key] !== null && query[key].$exists !== undefined) {
                  return (get(doc, key) !== undefined && get(doc, key) !== null) === query[key].$exists;
                }
                return deepEqual(get(doc, key), query[key]);
              });
            });
            return Promise.resolve(itemsToSearch.length);
          }
        };
      },
      count: (query = {}) => {
        console.log(`Mock collection '${name}' count with query:`, JSON.stringify(query));
        return this.countDocuments(query);
      },
      aggregate: (pipeline = []) => {
        console.log(`Mock collection '${name}' aggregate with pipeline:`, JSON.stringify(pipeline));
        return createCursor();
      },
      distinct: function(field, queryConditions = {}) { // Using 'function' for 'this' context
        const currentCollectionName = this.collectionName || name; // 'this.collectionName' might be set by Mongoose Model context
        console.log(`Mock collection '${currentCollectionName}' distinct on field: '${field}' with conditions:`, JSON.stringify(queryConditions));
        
        let filteredData = collectionData;
        if (Object.keys(queryConditions).length > 0) {
          filteredData = collectionData.filter(item => {
            return Object.keys(queryConditions).every(key => {
              // Handle _id with string comparison for mock IDs
              if (key === '_id' && item[key] !== undefined && queryConditions[key] !== undefined) {
                return String(item[key]) === String(queryConditions[key]);
              }
              // Basic equality check for other keys
              // More complex query operators ($in, $gt, etc.) would need more logic here
              return item[key] === queryConditions[key];
            });
          });
        }

        const values = new Set();
        filteredData.forEach(doc => {
          // Handle dot notation for nested fields (e.g., 'ReleaseType.Code')
          let valueToConsider = doc;
          if (field.includes('.')) {
            const parts = field.split('.');
            for (const part of parts) {
              if (valueToConsider && typeof valueToConsider === 'object' && Object.prototype.hasOwnProperty.call(valueToConsider, part)) {
                valueToConsider = valueToConsider[part];
              } else {
                valueToConsider = undefined;
                break;
              }
            }
          } else {
            valueToConsider = doc[field];
          }

          if (valueToConsider !== undefined) {
            if (Array.isArray(valueToConsider)) {
              valueToConsider.forEach(v => values.add(v));
            } else {
              values.add(valueToConsider);
            }
          }
        });
        
        // Return an object that mimics a Mongoose Query with an exec method
        return {
          exec: () => {
            return new Promise((resolve, _reject) => {
              setTimeout(() => {
                const result = Array.from(values);
                console.log(`Mock collection '${currentCollectionName}' distinct result for field '${field}':`, result);
                resolve(result);
              }, 50); // Small delay to mimic async behavior
            });
          }
          // Other chainable Mongoose Query methods (e.g., .sort(), .limit()) could be added here if needed.
          // For 'distinct', .exec() or direct await is common.
        };
      },
      insertOne: (doc) => {
        console.log(`Mock collection '${name}' insertOne:`, JSON.stringify(doc));
        return Promise.resolve({ insertedId: 'mock-id-' + Date.now(), acknowledged: true });
      },
      insertMany: (docs) => {
        console.log(`Mock collection '${name}' insertMany:`, JSON.stringify(docs));
        return Promise.resolve({ insertedIds: docs.map(() => 'mock-id-' + Date.now()), acknowledged: true });
      },
      updateOne: (filter, update) => {
        console.log(`Mock collection '${name}' updateOne with filter:`, JSON.stringify(filter));
        return Promise.resolve({ modifiedCount: 1, acknowledged: true });
      },
      updateMany: (filter, update) => {
        console.log(`Mock collection '${name}' updateMany with filter:`, JSON.stringify(filter));
        return Promise.resolve({ modifiedCount: 2, acknowledged: true });
      },
      deleteOne: (filter) => {
        console.log(`Mock collection '${name}' deleteOne with filter:`, JSON.stringify(filter));
        return Promise.resolve({ deletedCount: 1, acknowledged: true });
      },
      deleteMany: (filter) => {
        console.log(`Mock collection '${name}' deleteMany with filter:`, JSON.stringify(filter));
        return Promise.resolve({ deletedCount: 2, acknowledged: true });
      },
      // Add any other collection methods you need
    };
  };
  
  // Create collections map
  const mockCollections = {};
  Object.keys(mockData).forEach(name => {
    mockCollections[name] = createMockCollection(name, resolveCollectionKeyForModel);
  });
  
  // Special handling for users collection since it seems to be causing issues
  if (!mockCollections.users) {
    mockCollections.users = createMockCollection('users', resolveCollectionKeyForModel);
  }
  
  // Create a direct accessor for collections
  const getCollection = (name) => {
    if (!mockCollections[name]) {
      console.log(`Creating on-demand mock collection: ${name}`);
      // Only pass name and the resolver to createMockCollection (mockData is now global)
      mockCollections[name] = createMockCollection(name, resolveCollectionKeyForModel);
    }
    return mockCollections[name];
  };

  const createMockModel = (modelName, _schema) => {
    // _schema is available if needed for more complex model/instance behavior in the future
    console.log(`Attempting to create/retrieve mock model for: ${modelName}`);
    const modelStaticMethods = getCollection(modelName);

    if (!modelStaticMethods) {
      console.error(`CRITICAL: getCollection returned undefined for ${modelName}. Cannot create mock model.`);
      // Return a very basic mock to prevent further crashes, clearly indicating an error
      return { 
        modelName: modelName + '_ERROR_UNDEFINED_COLLECTION',
        findById: () => { console.error(`findById called on ERROR model ${modelName}`); return Promise.resolve(null); },
        findOne: () => { console.error(`findOne called on ERROR model ${modelName}`); return Promise.resolve(null); },
        // Add other common methods as error stubs if necessary
      };
    }

    console.log(`[Mock Model Created/Retrieved] ${modelName} - Static methods object keys:`, modelStaticMethods ? Object.keys(modelStaticMethods) : 'undefined');
    
    if (typeof modelStaticMethods.findById !== 'function') {
      console.error(`CRITICAL: findById is NOT a function on mock model ${modelName}. Available methods:`, Object.keys(modelStaticMethods));
    } else {
      console.log(`[Mock Model Check] ${modelName} has findById function.`);
    }
    
    // The "Model" in our mock setup is primarily the collection of static methods.
    return modelStaticMethods;
  };
  
  // Create the mock connection object
  const mockConnection = {
    readyState: 1, // Connected
    models: mongoose.models,
    
    // Mock db property with collection method
    db: {
      collection: getCollection,
      admin: () => ({
        ping: () => Promise.resolve(true),
        listDatabases: () => Promise.resolve({ databases: [{ name: 'mock_db', sizeOnDisk: 0 }] }),
        serverStatus: () => Promise.resolve({ version: 'mock' })
      }),
      command: () => Promise.resolve({ ok: 1 }),
      stats: () => Promise.resolve({ collections: Object.keys(mockCollections).length })
    },
    
    // Common connection methods
    close: () => {
      console.log('Closing mock mongoose connection');
      return Promise.resolve();
    },
    
    // Direct collection access method - this is what mongoose uses internally
    collection: getCollection,
    
    // Used by some mongoose operations
    collections: mockCollections,
  };
  
  // Replace mongoose's own connection with our mock
  const originalConnection = mongoose.connection;
  mongoose.connection = mockConnection;
  
  // Monkey patch the original mongoose to intercept any direct operations
  const originalCreateConnection = mongoose.createConnection;
  mongoose.createConnection = () => {
    console.log('Intercepted mongoose.createConnection call');
    return mockConnection;
  };
  
  // Patch mongoose.model to ensure our models are used
  const originalModel = mongoose.model;
  mongoose.model = function(name, schema) {
    console.log(`Registering model: ${name}`);
    if (schema) {
      // If schema is provided, it's a model definition
      const MockModel = createMockModel(name, schema); // Our mock model creation
      mockModels[name] = MockModel; // Store it for reuse
      return MockModel; // Return the created mock model
    } else {
      // If no schema, it's a request to retrieve an existing model
      // Retrieve from our cache or delegate to original mongoose.model if not found in our mocks.
      return mockModels[name] || originalModel.call(mongoose, name);
    }
  }; // End of mongoose.model override

  // The Collection.prototype.countDocuments patch previously here has been removed 
  // to simplify and avoid conflicts with mockModel.countDocuments.
  
  return mockConnection;
}

module.exports = { setupMockMongoose };
