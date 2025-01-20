from setuptools import setup, find_packages

setup(
    name="lightweight_pycharts",
    version="0.0.0",
    description="Python based web-app for Viewing & Manipulating TimeSeries Data.",
    packages=find_packages(),
    long_description="TBD",
    long_description_content_type="text/markdown",
    url="https://github.com/jack-of-some-trades/lightweight-pycharts",
    author="jack_of_some_trades",
    author_email="Bryce.m.hawk@gmail.com",
    license="TBD",
    # Package Versions based off currently used, not minimally needed
    python_requires=">=3.12",
    install_requires=[
        "pandas>=2.2.2",
        "pandas_market_calendars>=4.6.0",
        "pywebview>=5.1",
    ],
    package_data={
        "lightweight_pycharts": ["frontend/*"],
    },
)
