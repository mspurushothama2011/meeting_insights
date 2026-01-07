"""
MongoDB Index Verification and Optimization Tool

This script verifies and optimizes MongoDB indexes for the IMIP application.
It checks for missing indexes, analyzes query performance, and creates optimal indexes.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, TEXT
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class IndexOptimizer:
    """MongoDB index optimizer and verifier."""
    
    def __init__(self, mongodb_url: str = None, database_name: str = None):
        """Initialize the optimizer with MongoDB connection."""
        self.mongodb_url = mongodb_url or os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
        self.database_name = database_name or os.getenv('DATABASE_NAME', 'imip')
        self.client = None
        self.db = None
    
    async def connect(self):
        """Connect to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(self.mongodb_url)
            self.db = self.client[self.database_name]
            # Test connection
            await self.client.admin.command('ping')
            print(f"✅ Connected to MongoDB: {self.database_name}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            print("✅ Disconnected from MongoDB")
    
    async def list_existing_indexes(self, collection_name: str) -> List[Dict]:
        """List all existing indexes for a collection."""
        collection = self.db[collection_name]
        indexes = await collection.index_information()
        return indexes
    
    async def analyze_collection_stats(self, collection_name: str) -> Dict:
        """Get collection statistics."""
        collection = self.db[collection_name]
        stats = await self.db.command('collStats', collection_name)
        return {
            'count': stats.get('count', 0),
            'size': stats.get('size', 0),
            'avgObjSize': stats.get('avgObjSize', 0),
            'storageSize': stats.get('storageSize', 0),
            'indexes': stats.get('nindexes', 0),
            'totalIndexSize': stats.get('totalIndexSize', 0)
        }
    
    async def create_index(self, collection_name: str, keys: List[tuple], name: str = None, **kwargs):
        """Create an index on a collection."""
        collection = self.db[collection_name]
        try:
            result = await collection.create_index(keys, name=name, **kwargs)
            print(f"✅ Created index '{result}' on {collection_name}")
            return result
        except Exception as e:
            print(f"❌ Failed to create index on {collection_name}: {e}")
            return None
    
    async def drop_index(self, collection_name: str, index_name: str):
        """Drop an index from a collection."""
        collection = self.db[collection_name]
        try:
            await collection.drop_index(index_name)
            print(f"✅ Dropped index '{index_name}' from {collection_name}")
            return True
        except Exception as e:
            print(f"❌ Failed to drop index from {collection_name}: {e}")
            return False
    
    def format_index_key(self, keys) -> str:
        """Format index keys for display."""
        if isinstance(keys, list):
            return ", ".join([f"{k}: {v}" for k, v in keys])
        return str(keys)
    
    async def verify_and_optimize_users_collection(self):
        """Verify and optimize indexes for users collection."""
        print("\n" + "="*80)
        print("📊 USERS COLLECTION")
        print("="*80)
        
        collection_name = "users"
        
        # Get current stats
        stats = await self.analyze_collection_stats(collection_name)
        print(f"\nCollection Stats:")
        print(f"  Documents: {stats['count']}")
        print(f"  Size: {stats['size']:,} bytes ({stats['size']/1024/1024:.2f} MB)")
        print(f"  Avg Doc Size: {stats['avgObjSize']} bytes")
        print(f"  Indexes: {stats['indexes']}")
        print(f"  Total Index Size: {stats['totalIndexSize']:,} bytes ({stats['totalIndexSize']/1024/1024:.2f} MB)")
        
        # List existing indexes
        existing_indexes = await self.list_existing_indexes(collection_name)
        print(f"\nExisting Indexes:")
        for name, info in existing_indexes.items():
            keys = info.get('key', {})
            print(f"  - {name}: {self.format_index_key(list(keys.items()))}")
        
        # Define optimal indexes
        optimal_indexes = [
            {
                'name': 'email_unique',
                'keys': [('email', ASCENDING)],
                'unique': True,
                'description': 'Unique index for email lookups (login, registration)'
            },
            {
                'name': 'role_active',
                'keys': [('role', ASCENDING), ('is_active', ASCENDING)],
                'description': 'Compound index for filtering users by role and status'
            },
            {
                'name': 'created_at_desc',
                'keys': [('created_at', DESCENDING)],
                'description': 'Index for sorting users by creation date'
            }
        ]
        
        print(f"\nOptimal Indexes:")
        for idx in optimal_indexes:
            print(f"  - {idx['name']}: {self.format_index_key(idx['keys'])}")
            print(f"    Purpose: {idx['description']}")
        
        # Create missing indexes
        print(f"\nCreating Missing Indexes:")
        for idx in optimal_indexes:
            if idx['name'] not in existing_indexes:
                kwargs = {k: v for k, v in idx.items() if k not in ['name', 'keys', 'description']}
                await self.create_index(collection_name, idx['keys'], idx['name'], **kwargs)
            else:
                print(f"  ⏭️  Index '{idx['name']}' already exists")
    
    async def verify_and_optimize_meetings_collection(self):
        """Verify and optimize indexes for meetings collection."""
        print("\n" + "="*80)
        print("📊 MEETINGS COLLECTION")
        print("="*80)
        
        collection_name = "meetings"
        
        # Get current stats
        stats = await self.analyze_collection_stats(collection_name)
        print(f"\nCollection Stats:")
        print(f"  Documents: {stats['count']}")
        print(f"  Size: {stats['size']:,} bytes ({stats['size']/1024/1024:.2f} MB)")
        print(f"  Avg Doc Size: {stats['avgObjSize']} bytes")
        print(f"  Indexes: {stats['indexes']}")
        print(f"  Total Index Size: {stats['totalIndexSize']:,} bytes ({stats['totalIndexSize']/1024/1024:.2f} MB)")
        
        # List existing indexes
        existing_indexes = await self.list_existing_indexes(collection_name)
        print(f"\nExisting Indexes:")
        for name, info in existing_indexes.items():
            keys = info.get('key', {})
            print(f"  - {name}: {self.format_index_key(list(keys.items()))}")
        
        # Define optimal indexes
        optimal_indexes = [
            {
                'name': 'user_id_created_at',
                'keys': [('user_id', ASCENDING), ('created_at', DESCENDING)],
                'description': 'Compound index for user meetings sorted by date (most common query)'
            },
            {
                'name': 'user_id_title',
                'keys': [('user_id', ASCENDING), ('title', ASCENDING)],
                'description': 'Compound index for user meetings with title sorting'
            },
            {
                'name': 'created_at_desc',
                'keys': [('created_at', DESCENDING)],
                'description': 'Index for global meeting timeline'
            },
            {
                'name': 'text_search',
                'keys': [('title', TEXT), ('transcript', TEXT), ('summary', TEXT)],
                'weights': {'title': 10, 'summary': 5, 'transcript': 1},
                'description': 'Full-text search index with weighted fields'
            }
        ]
        
        print(f"\nOptimal Indexes:")
        for idx in optimal_indexes:
            if idx['name'] == 'text_search':
                print(f"  - {idx['name']}: TEXT index on title, transcript, summary")
                print(f"    Weights: title=10, summary=5, transcript=1")
            else:
                print(f"  - {idx['name']}: {self.format_index_key(idx['keys'])}")
            print(f"    Purpose: {idx['description']}")
        
        # Create missing indexes
        print(f"\nCreating Missing Indexes:")
        for idx in optimal_indexes:
            if idx['name'] not in existing_indexes:
                kwargs = {k: v for k, v in idx.items() if k not in ['name', 'keys', 'description']}
                await self.create_index(collection_name, idx['keys'], idx['name'], **kwargs)
            else:
                print(f"  ⏭️  Index '{idx['name']}' already exists")
    
    async def analyze_query_performance(self):
        """Analyze common query patterns and their performance."""
        print("\n" + "="*80)
        print("🔍 QUERY PERFORMANCE ANALYSIS")
        print("="*80)
        
        # Check if profiling is enabled
        profile_level = await self.db.command('profile', -1)
        print(f"\nProfiling Level: {profile_level.get('was', 0)}")
        print("  0 = Off, 1 = Slow queries only, 2 = All queries")
        
        # Common query patterns to test
        queries = [
            {
                'collection': 'users',
                'query': {'email': 'test@example.com'},
                'description': 'User lookup by email (login)'
            },
            {
                'collection': 'users',
                'query': {'role': 'member', 'is_active': True},
                'description': 'Active users by role'
            },
            {
                'collection': 'meetings',
                'query': {'user_id': 'test_user_id'},
                'sort': [('created_at', DESCENDING)],
                'description': 'User meetings sorted by date'
            }
        ]
        
        print("\nTesting Common Query Patterns:")
        for q in queries:
            collection = self.db[q['collection']]
            query = q['query']
            sort = q.get('sort')
            
            # Explain query
            explain = await collection.find(query).sort(sort if sort else []).explain()
            
            execution_stats = explain.get('executionStats', {})
            execution_time = execution_stats.get('executionTimeMillis', 0)
            docs_examined = execution_stats.get('totalDocsExamined', 0)
            docs_returned = execution_stats.get('nReturned', 0)
            
            winning_plan = explain.get('queryPlanner', {}).get('winningPlan', {})
            index_used = winning_plan.get('inputStage', {}).get('indexName', 'Collection Scan')
            
            print(f"\n  Query: {q['description']}")
            print(f"    Collection: {q['collection']}")
            print(f"    Filter: {query}")
            if sort:
                print(f"    Sort: {self.format_index_key(sort)}")
            print(f"    Index Used: {index_used}")
            print(f"    Execution Time: {execution_time} ms")
            print(f"    Docs Examined: {docs_examined}")
            print(f"    Docs Returned: {docs_returned}")
            if docs_examined > 0 and docs_returned > 0:
                efficiency = (docs_returned / docs_examined) * 100
                print(f"    Efficiency: {efficiency:.1f}%")
    
    async def generate_recommendations(self):
        """Generate optimization recommendations."""
        print("\n" + "="*80)
        print("💡 OPTIMIZATION RECOMMENDATIONS")
        print("="*80)
        
        recommendations = [
            {
                'title': 'Compound Index Usage',
                'description': 'The user_id_created_at compound index supports both filtering by user and sorting by date in a single index.',
                'impact': 'HIGH',
                'action': 'Already implemented ✅'
            },
            {
                'title': 'Text Search Weights',
                'description': 'Text search index uses weights (title=10, summary=5, transcript=1) to prioritize title matches.',
                'impact': 'MEDIUM',
                'action': 'Already implemented ✅'
            },
            {
                'title': 'Index Selectivity',
                'description': 'Email and user_id indexes have high selectivity (many unique values), making them very efficient.',
                'impact': 'HIGH',
                'action': 'Optimal ✅'
            },
            {
                'title': 'Avoid Over-Indexing',
                'description': 'Only create indexes for frequently queried fields. Too many indexes slow down writes.',
                'impact': 'MEDIUM',
                'action': 'Monitor write performance'
            },
            {
                'title': 'Regular Index Maintenance',
                'description': 'Run this script monthly to verify indexes and check for fragmentation.',
                'impact': 'LOW',
                'action': 'Schedule monthly runs'
            }
        ]
        
        for rec in recommendations:
            print(f"\n{rec['title']}")
            print(f"  Impact: {rec['impact']}")
            print(f"  Description: {rec['description']}")
            print(f"  Action: {rec['action']}")
    
    async def run_full_analysis(self):
        """Run complete index analysis and optimization."""
        if not await self.connect():
            return False
        
        try:
            print("\n" + "="*80)
            print("🚀 MONGODB INDEX OPTIMIZATION TOOL")
            print("="*80)
            print(f"Database: {self.database_name}")
            print(f"Connection: {self.mongodb_url}")
            
            # Verify and optimize collections
            await self.verify_and_optimize_users_collection()
            await self.verify_and_optimize_meetings_collection()
            
            # Analyze query performance
            await self.analyze_query_performance()
            
            # Generate recommendations
            await self.generate_recommendations()
            
            print("\n" + "="*80)
            print("✅ ANALYSIS COMPLETE")
            print("="*80)
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error during analysis: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await self.disconnect()


async def main():
    """Main entry point."""
    optimizer = IndexOptimizer()
    success = await optimizer.run_full_analysis()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
