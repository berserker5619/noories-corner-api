import { Router } from 'express';
import mongoose from 'mongoose'

import auth from '../middleware/auth.js';
import rootAuth from '../middleware/root-auth.js';
import Amazon from '../models/amazon.js';
import { pageGenerator } from './page-generator.js';

const router = new Router()

//add product to amazon collection
router.post('/amazon/admin', rootAuth, auth, async (req, res, next) => {
    try {
        const product = new Amazon(req.body)
        await product.validate(); // This will throw an error if the input is invalid
        await product.save()
        res.status(201).send(product)
    } catch (e) {
        switch (e.code) {
            case 11000:
                e.status = 409;
                e.message = 'Product already exists'
                break;
            case 12000:
            case 12500:
                e.status = 409;
                e.message = `Validation Error: ${e.message}`
                break;
        }
        next(e)
    }
})

//get products from amazon collection
router.get('/amazon', rootAuth, async (req, res, next) => {
    try {
        const { color, design, page } = req.query;
        const colorArray = color ? JSON.parse(color) : [];
        const designArray = design ? JSON.parse(design) : [];
        const skip = parseInt(page) * 12 || 0;
        const query = colorArray.length && designArray.length
            ? designArray.flatMap((designItem) =>
                colorArray.map((colorItem) => ({
                    Design: parseInt(designItem.Design),
                    Color: colorItem.Color,
                }))
            )
            : [...colorArray, ...designArray].map((item) => {
                if (item.Color) {
                    return { Color: item.Color };
                } else if (item.Design) {
                    return { Design: parseInt(item.Design) };
                }
                return {};
            });
        const products = await Amazon.find(
            query.length > 0 ? { $or: query } : {},
            'ProductName Price Rating Image1 Platform'
        )
            .limit(12)
            .skip(skip);
        const count = await Amazon.countDocuments({});
        return res.status(200).send({
            products,
            pages: pageGenerator(query, products.length, count),
        });
    } catch (e) {
        next(e)
    }
});

//get product with id from amazon collection
router.get('/amazon/:id', rootAuth, async (req, res, next) => {
    try {
        const id = req.params.id;
        // Validate the input
        if (!isValidId(id)) {
            throw new Error('400')
        }
        // Fetch the product or throw an error if not found
        const product = await Amazon.findOneOrFail({ _id: id });
        res.status(200).send(product);
    } catch (e) {
        if (e.name === 'EntityNotFoundError') {
            e.status = 404;
            e.message = 'Product no found'
        }
        else if (e.message === '400') {
            e.status = 400;
            e.message = "Invalid ID";
        }
        next(e)
    }
});

function isValidId(id) {
    return mongoose.isValidObjectId(id);
}

//update product in amazon collection
router.put('/amazon/admin', rootAuth, auth, async (req, res, next) => {
    try {
        const {
            ProductId,
            ProductName,
            Design,
            SKU,
            Color,
            Fabric,
            ProductDescription,
            NeckType,
            Occassion,
            BrandName,
            StitchType,
            Size,
            Image1,
            Image2,
            SizeChart,
        } = req.body;
        const product = await Amazon.findByIdAndUpdate(
            req.body._id,
            {
                ProductId,
                ProductName,
                Design,
                SKU,
                Color,
                Fabric,
                ProductDescription,
                NeckType,
                Occassion,
                BrandName,
                StitchType,
                Size,
                Image1,
                Image2,
                SizeChart,
            },
            { new: true }
        );
        if (!product) {
            throw new Error('400')
        }
        return res.status(200).send(product);
    } catch (e) {
        if (e.name === 'EntityNotFoundError') {
            e.status = 404;
            e.message = 'Product no found'
        }
        else if (e.message === '400') {
            e.status = 400;
            e.message = "Invalid ID";
        }
        next(e)
    }
});

//delete product in amazon collection
router.delete('/amazon/admin/:id', rootAuth, auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Amazon.findOneAndDelete({ _id: id });
        if (!product) {
            throw new Error('400')
        }
        return res.status(200).send(product);
    } catch (e) {
        if (e.name === 'EntityNotFoundError') {
            e.status = 404;
            e.message = 'Product no found'
        }
        else if (e.message === '400') {
            e.status = 400;
            e.message = "Invalid ID";
        }
        next(e)
    }
});

router.get('/amazontop', rootAuth, async (req, res, next) => {
    try {
        const topSelling = await Amazon.find({ topSelling: true }, 'Image1').lean();
        topSelling.forEach(product => {
            product.Platform = 'amazon';
        });

        const topRated = await Amazon.find({ topRated: true }, 'Image1').lean();
        topRated.forEach(product => {
            product.Platform = 'amazon';
        });
        return res.status(200).send({ topSelling, topRated });
    }
    catch (e) {
        next(e)
    }
})

export default router