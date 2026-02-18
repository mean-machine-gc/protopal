#!/bin/bash
# Script to update all examples to use the published NPM package
# Run this AFTER publishing to NPM

echo "Updating examples to use published protopal package..."

# Update counter example
echo "Updating counter example..."
sed -i.bak 's|"protopal": "file:\.\./\.\."|"protopal": "^0.1.0"|' examples/counter/package.json
rm examples/counter/package.json.bak

# Update todo example  
echo "Updating todo example..."
sed -i.bak 's|"protopal": "file:\.\./\.\."|"protopal": "^0.1.0"|' examples/todo/package.json
rm examples/todo/package.json.bak

# Update ecommerce example
echo "Updating ecommerce example..."
sed -i.bak 's|"protopal": "file:\.\./\.\."|"protopal": "^0.1.0"|' examples/ecommerce/package.json
rm examples/ecommerce/package.json.bak

echo "✓ All examples updated to use published NPM package"
echo "Next steps:"
echo "1. cd examples/counter && rm -rf node_modules package-lock.json && npm install"
echo "2. cd examples/todo && rm -rf node_modules package-lock.json && npm install" 
echo "3. cd examples/ecommerce && rm -rf node_modules package-lock.json && npm install"
echo "4. Test that all examples still build and run correctly"