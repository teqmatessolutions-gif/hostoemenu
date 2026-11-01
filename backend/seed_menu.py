from app.database import SessionLocal
from app.models.branch import Branch
from app.models.food_category import FoodCategory
from app.models.food_item import FoodItem
from app.models.restaurant_table import RestaurantTable

db = SessionLocal()
try:
    branch = db.query(Branch).filter(Branch.is_active == True).first()
    if not branch:
        branch = Branch(
            name="Gourmet Bistro & Cafe", 
            code="MAIN", 
            address="102 Downtown Avenue, City Center", 
            phone="9876543210", 
            is_active=True
        )
        db.add(branch)
        db.commit()
        db.refresh(branch)
    print(f"Using Branch: {branch.id} - {branch.name} ({branch.code})")

    # Tables
    table_count = db.query(RestaurantTable).filter(RestaurantTable.branch_id == branch.id).count()
    if table_count == 0:
        t1 = RestaurantTable(table_number="01", seating_capacity=4, status="available", branch_id=branch.id)
        t2 = RestaurantTable(table_number="02", seating_capacity=2, status="available", branch_id=branch.id)
        t3 = RestaurantTable(table_number="03", seating_capacity=6, status="available", branch_id=branch.id)
        t4 = RestaurantTable(table_number="VIP-1", seating_capacity=8, status="available", branch_id=branch.id)
        db.add_all([t1, t2, t3, t4])
        db.commit()
        print("Created 4 dining tables.")

    cats = db.query(FoodCategory).filter(FoodCategory.branch_id == branch.id).all()
    if not cats:
        cat1 = FoodCategory(name="Appetizers & Starters", branch_id=branch.id)
        cat2 = FoodCategory(name="Main Course", branch_id=branch.id)
        cat3 = FoodCategory(name="Artisan Pizzas & Burgers", branch_id=branch.id)
        cat4 = FoodCategory(name="Beverages & Mocktails", branch_id=branch.id)
        cat5 = FoodCategory(name="Desserts", branch_id=branch.id)
        db.add_all([cat1, cat2, cat3, cat4, cat5])
        db.commit()
        cats = [cat1, cat2, cat3, cat4, cat5]
        print(f"Created {len(cats)} categories.")
    else:
        print(f"Found {len(cats)} existing categories.")

    items_count = db.query(FoodItem).filter(FoodItem.branch_id == branch.id).count()
    if items_count == 0:
        c_starters = next((c for c in cats if "Starters" in c.name), cats[0])
        c_mains = next((c for c in cats if "Main" in c.name), cats[1] if len(cats) > 1 else cats[0])
        c_pizza = next((c for c in cats if "Pizza" in c.name), cats[2] if len(cats) > 2 else cats[0])
        c_drinks = next((c for c in cats if "Beverages" in c.name), cats[3] if len(cats) > 3 else cats[0])
        c_dessert = next((c for c in cats if "Desserts" in c.name), cats[4] if len(cats) > 4 else cats[0])

        sample_items = [
            FoodItem(
                name="Truffle Parmesan Fries",
                description="Crispy golden fries tossed in aromatic white truffle oil, rosemary, and aged parmesan.",
                price=220.0,
                room_service_price=250.0,
                category_id=c_starters.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="Crispy Paneer Tikka Bites",
                description="Charcoal-smoked cottage cheese cubes marinated in tandoori spices with mint chutney.",
                price=310.0,
                room_service_price=340.0,
                category_id=c_starters.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="Butter Chicken Masala with Garlic Naan",
                description="Tender chicken simmered in a velvety tomato-butter gravy finished with fresh cream.",
                price=440.0,
                room_service_price=480.0,
                category_id=c_mains.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="Dal Makhani Royale",
                description="Slow-cooked black lentils simmered overnight with butter, cream, and mild spices.",
                price=320.0,
                room_service_price=350.0,
                category_id=c_mains.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="Wood-Fired Margherita Pizza",
                description="Fresh buffalo mozzarella, San Marzano tomato sauce, and fresh basil leaves on sourdough.",
                price=390.0,
                room_service_price=420.0,
                category_id=c_pizza.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="BBQ Smoked Chicken Burger",
                description="Grilled chicken patty glazed in hickory BBQ sauce with cheddar cheese and crispy lettuce.",
                price=340.0,
                room_service_price=370.0,
                category_id=c_pizza.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="Passion Fruit & Mint Mojito",
                description="Sparkling cooler muddled with fresh mint sprigs, lime wedges, and passion fruit syrup.",
                price=180.0,
                room_service_price=200.0,
                category_id=c_drinks.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            ),
            FoodItem(
                name="Warm Molten Chocolate Lava Cake",
                description="Decadent Belgian dark chocolate cake with a molten center, served with vanilla bean gelato.",
                price=240.0,
                room_service_price=270.0,
                category_id=c_dessert.id,
                branch_id=branch.id,
                available=True,
                always_available=True
            )
        ]
        db.add_all(sample_items)
        db.commit()
        print(f"Created {len(sample_items)} sample food items successfully.")
    else:
        print(f"Found {items_count} existing food items.")
finally:
    db.close()
