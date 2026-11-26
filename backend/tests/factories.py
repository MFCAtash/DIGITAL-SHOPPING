import itertools

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductImage

_phone = itertools.count(1)


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    phone = factory.LazyFunction(lambda: f"0912{next(_phone):07d}")


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ("slug",)

    slug = "phones"
    name_i18n = {"fa": "گوشی"}


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    slug = factory.Sequence(lambda n: f"product-{n}")
    brand = "Xiaomi"
    category = factory.SubFactory(CategoryFactory)
    name = factory.Sequence(lambda n: f"Product {n}")
    description_i18n = {"fa": "توضیح"}
    price_usd_cents = 20000
    discount_percent = 0
    price_checked_on = factory.LazyFunction(timezone.localdate)
    status = Product.Status.ACTIVE
    purchasable = True
    stock = 5

    @factory.post_generation
    def with_image(self, create, extracted, **kwargs):
        if create and extracted is not False:
            ProductImage.objects.create(product=self, file_name=f"{self.slug}-1.webp", alt_i18n={"fa": "عکس"})
